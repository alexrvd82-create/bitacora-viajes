// Webhook de Ko-fi -> activa Pro cuando alguien compra "Travel-Mapping PRO" en la tienda.
// Ko-fi envía un POST form-encoded con un campo "data" que contiene un JSON.
// Secretos necesarios: KOFI_VERIFICATION_TOKEN (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya existen en Supabase).
import { createClient } from "npm:@supabase/supabase-js@2";

// Código del producto: es lo que va tras /s/ en https://ko-fi.com/s/81275b779b
const PRO_ITEM_CODE = "81275b779b";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok", { status: 200 });

  // 1) Leer el JSON del campo "data"
  let payload: any;
  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      payload = await req.json();
    } else {
      const form = await req.formData();
      payload = JSON.parse(String(form.get("data") || "{}"));
    }
  } catch {
    return new Response("bad request", { status: 400 });
  }

  // 2) Comprobar que viene de Ko-fi (el token debe existir y coincidir)
  const expected = Deno.env.get("KOFI_VERIFICATION_TOKEN");
  if (!expected || payload?.verification_token !== expected) {
    return new Response("unauthorized", { status: 401 });
  }

  // 3) Solo nos interesa la compra del producto Pro
  const items: any[] = Array.isArray(payload?.shop_items) ? payload.shop_items : [];
  if (payload?.type !== "Shop Order") return new Response("ignored", { status: 200 });
  if (!items.some((i) => i?.direct_link_code === PRO_ITEM_CODE)) {
    console.warn("Pedido de tienda sin el producto Pro. Códigos recibidos:", items.map((i) => i?.direct_link_code));
    return new Response("ignored", { status: 200 });
  }

  const email = String(payload?.email || "").trim();
  if (!email) return new Response("no email", { status: 200 });

  // 4) Activar Pro para la cuenta con ese email
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await supabase.rpc("activate_pro_by_email", { p_email: email });
  if (error) {
    console.error("Error activando Pro:", error.message);
    return new Response("error", { status: 500 });
  }
  if (!data) {
    // El comprador pagó con un email distinto al de su cuenta: activar a mano en Supabase
    console.warn("Compra Pro sin cuenta con ese email:", email);
    return new Response("user-not-found", { status: 200 });
  }
  return new Response("activated", { status: 200 });
});
