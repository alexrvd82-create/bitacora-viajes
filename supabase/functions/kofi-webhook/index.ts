import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const form = await req.formData();
  const raw = form.get("data");
  if (!raw) return new Response("Missing data", { status: 400 });

  let payload: any;
  try {
    payload = JSON.parse(raw as string);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (payload.verification_token !== Deno.env.get("KOFI_VERIFICATION_TOKEN")) {
    console.error("Token de verificación de Ko-fi inválido");
    return new Response("Invalid token", { status: 401 });
  }

  const isMembershipPayment =
    payload.type === "Subscription" || (payload.type === "Donation" && payload.is_subscription_payment);

  if (!isMembershipPayment) {
    return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200 });
  }

  const email = (payload.email || "").toLowerCase().trim();
  if (!email) return new Response(JSON.stringify({ received: true, noEmail: true }), { status: 200 });

  const { data: users, error: userErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (userErr) {
    console.error("Error buscando usuario:", userErr);
    return new Response("Error interno", { status: 500 });
  }
  const user = users.users.find((u) => (u.email || "").toLowerCase() === email);

  if (!user) {
    console.error("Pago de Ko-fi sin usuario coincidente:", email);
    return new Response(JSON.stringify({ received: true, noMatch: true }), { status: 200 });
  }

  await supabase.from("subscriptions").upsert({
    user_id: user.id,
    status: "active",
    updated_at: new Date().toISOString(),
  });

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});