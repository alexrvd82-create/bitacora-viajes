import { useState } from "react";
import { supabase } from "./supabaseClient";

const ink = "#101d33", panel = "#16233d", line = "#2b3c5c", paper = "#efe6d2", brass = "#c1913f", rust = "#b2453f", teal = "#3f7a76";

export default function Auth() {
  const [mode, setMode] = useState("login"); // "login" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg({ type: "error", text: error.message });
    } else if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMsg({ type: "error", text: error.message });
      else setMsg({ type: "ok", text: "Cuenta creada. Revisa tu email para confirmarla y luego inicia sesión." });
    } else if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) setMsg({ type: "error", text: error.message });
      else setMsg({ type: "ok", text: "Te hemos enviado un email con un enlace para cambiar tu contraseña. Revisa también spam." });
    }
    setLoading(false);
  }

  const title = mode === "login" ? "INICIAR SESIÓN" : mode === "signup" ? "CREAR CUENTA" : "RECUPERAR CONTRASEÑA";

  return (
    <div style={{ minHeight: "100vh", background: ink, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Inter',sans-serif", color: paper }}>
      <div style={{ width: "100%", maxWidth: 360, background: panel, border: `1px solid ${line}`, borderRadius: 8, padding: 24 }}>
        <img src="/logo.png" alt="Bitácora de viajes" style={{ width: 90, height: 90, display: "block", margin: "0 auto 12px" }} />
        <div style={{ fontFamily: "'Bitter',serif", fontSize: 24, fontWeight: 800, marginBottom: 4, textAlign: "center" }}>Bitácora de viajes</div>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#94a3c4", marginBottom: 20 }}>{title}</div>

        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 11, color: "#94a3c4", display: "block", marginBottom: 4 }}>Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            style={{ width: "100%", background: ink, border: `1px solid ${line}`, color: paper, borderRadius: 6, padding: 8, marginBottom: 12 }} />

          {mode !== "forgot" && (
            <>
              <label style={{ fontSize: 11, color: "#94a3c4", display: "block", marginBottom: 4 }}>Contraseña</label>
              <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                style={{ width: "100%", background: ink, border: `1px solid ${line}`, color: paper, borderRadius: 6, padding: 8, marginBottom: 8 }} />
            </>
          )}

          {mode === "login" && (
            <div style={{ textAlign: "right", marginBottom: 16 }}>
              <button type="button" onClick={() => { setMode("forgot"); setMsg(null); }}
                style={{ background: "none", border: "none", color: "#94a3c4", cursor: "pointer", fontSize: 12, padding: 0, textDecoration: "underline" }}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}
          {mode !== "login" && <div style={{ marginBottom: 16 }} />}

          {msg && (
            <div style={{ fontSize: 12, marginBottom: 12, color: msg.type === "error" ? rust : teal }}>{msg.text}</div>
          )}

          <button type="submit" disabled={loading} style={{ width: "100%", background: brass, color: ink, border: "none", borderRadius: 6, padding: 10, fontWeight: 600, cursor: "pointer" }}>
            {loading ? "Un momento..." : mode === "login" ? "Entrar" : mode === "signup" ? "Registrarme" : "Enviar enlace de recuperación"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#94a3c4" }}>
          {mode === "login" && (
            <>¿No tienes cuenta?{" "}
              <button onClick={() => { setMode("signup"); setMsg(null); }} style={{ background: "none", border: "none", color: brass, cursor: "pointer", padding: 0, font: "inherit" }}>Regístrate</button>
            </>
          )}
          {mode === "signup" && (
            <>¿Ya tienes cuenta?{" "}
              <button onClick={() => { setMode("login"); setMsg(null); }} style={{ background: "none", border: "none", color: brass, cursor: "pointer", padding: 0, font: "inherit" }}>Inicia sesión</button>
            </>
          )}
          {mode === "forgot" && (
            <button onClick={() => { setMode("login"); setMsg(null); }} style={{ background: "none", border: "none", color: brass, cursor: "pointer", padding: 0, font: "inherit" }}>Volver a iniciar sesión</button>
          )}
        </div>
      </div>
    </div>
  );
}
