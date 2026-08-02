import { useState } from "react";
import { supabase } from "./supabaseClient";
import { ArrowLeft } from "lucide-react";

const ink = "#0a0f1e", panel = "#141b30", line = "#2a3654", paper = "#efe6d2", brass = "#c1913f", rust = "#e5484d", teal = "#4fd1c5";

export default function Auth({ initialMode = "login", onBack }) {
  const [mode, setMode] = useState(initialMode); // "login" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setMsg(null);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }

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
      <div style={{ width: "100%", maxWidth: 360, background: panel, border: `1px solid ${line}`, borderRadius: 14, padding: 24, position: "relative" }}>
        {onBack && (
          <button onClick={onBack} aria-label="Volver"
            style={{ position: "absolute", top: 16, left: 16, background: "none", border: "none", color: "#94a3c4", cursor: "pointer", display: "flex" }}>
            <ArrowLeft size={18} />
          </button>
        )}
        <img src="/logo-v4.png" alt="Bitácora de viajes" style={{ width: 90, height: 90, display: "block", margin: "0 auto 12px" }} />
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 800, marginBottom: 4, textAlign: "center" }}>Bitácora de viajes</div>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#94a3c4", marginBottom: 20, textAlign: "center" }}>{title}</div>

        <button type="button" onClick={handleGoogle}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#fff", color: "#1f1f1f", border: "none", borderRadius: 10, padding: 10, fontWeight: 600, cursor: "pointer", marginBottom: 16, fontSize: 14 }}>
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z"/></svg>
          Continuar con Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: line }} />
          <span style={{ fontSize: 11, color: "#94a3c4" }}>o con email</span>
          <div style={{ flex: 1, height: 1, background: line }} />
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 11, color: "#94a3c4", display: "block", marginBottom: 4 }}>Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            style={{ width: "100%", background: ink, border: `1px solid ${line}`, color: paper, borderRadius: 10, padding: 8, marginBottom: 12 }} />

          {mode !== "forgot" && (
            <>
              <label style={{ fontSize: 11, color: "#94a3c4", display: "block", marginBottom: 4 }}>Contraseña</label>
              <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                style={{ width: "100%", background: ink, border: `1px solid ${line}`, color: paper, borderRadius: 10, padding: 8, marginBottom: 8 }} />
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

          <button type="submit" disabled={loading} style={{ width: "100%", background: brass, color: ink, border: "none", borderRadius: 10, padding: 10, fontWeight: 600, cursor: "pointer" }}>
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
