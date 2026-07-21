import { useState } from "react";
import { supabase } from "./supabaseClient";

const ink = "#101d33", panel = "#16233d", line = "#2b3c5c", paper = "#efe6d2", brass = "#c1913f", rust = "#b2453f";

export default function Auth() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
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
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMsg({ type: "error", text: error.message });
      else setMsg({ type: "ok", text: "Cuenta creada. Revisa tu email para confirmarla y luego inicia sesión." });
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: ink, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Inter',sans-serif", color: paper }}>
      <div style={{ width: "100%", maxWidth: 360, background: panel, border: `1px solid ${line}`, borderRadius: 8, padding: 24 }}>
        <div style={{ fontFamily: "'Bitter',serif", fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Bitácora de viajes</div>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#94a3c4", marginBottom: 20 }}>
          {mode === "login" ? "INICIAR SESIÓN" : "CREAR CUENTA"}
        </div>
        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 11, color: "#94a3c4", display: "block", marginBottom: 4 }}>Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            style={{ width: "100%", background: ink, border: `1px solid ${line}`, color: paper, borderRadius: 6, padding: 8, marginBottom: 12 }} />
          <label style={{ fontSize: 11, color: "#94a3c4", display: "block", marginBottom: 4 }}>Contraseña</label>
          <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
            style={{ width: "100%", background: ink, border: `1px solid ${line}`, color: paper, borderRadius: 6, padding: 8, marginBottom: 16 }} />
          {msg && (
            <div style={{ fontSize: 12, marginBottom: 12, color: msg.type === "error" ? rust : "#3f7a76" }}>{msg.text}</div>
          )}
          <button type="submit" disabled={loading} style={{ width: "100%", background: brass, color: ink, border: "none", borderRadius: 6, padding: 10, fontWeight: 600, cursor: "pointer" }}>
            {loading ? "Un momento..." : mode === "login" ? "Entrar" : "Registrarme"}
          </button>
        </form>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#94a3c4" }}>
          {mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMsg(null); }}
            style={{ background: "none", border: "none", color: brass, cursor: "pointer", padding: 0, font: "inherit" }}>
            {mode === "login" ? "Regístrate" : "Inicia sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}
