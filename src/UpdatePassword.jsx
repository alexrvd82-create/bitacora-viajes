import { useState } from "react";
import { supabase } from "./supabaseClient";

const ink = "#101d33", panel = "#16233d", line = "#2b3c5c", paper = "#efe6d2", brass = "#c1913f", rust = "#b2453f", teal = "#3f7a76";

export default function UpdatePassword({ onDone }) {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMsg({ type: "error", text: error.message });
      setLoading(false);
    } else {
      setMsg({ type: "ok", text: "Contraseña actualizada. Entrando..." });
      setTimeout(onDone, 1200);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: ink, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Inter',sans-serif", color: paper }}>
      <div style={{ width: "100%", maxWidth: 360, background: panel, border: `1px solid ${line}`, borderRadius: 8, padding: 24 }}>
        <div style={{ fontFamily: "'Bitter',serif", fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Nueva contraseña</div>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#94a3c4", marginBottom: 20 }}>ELIGE UNA CONTRASEÑA NUEVA</div>
        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 11, color: "#94a3c4", display: "block", marginBottom: 4 }}>Contraseña nueva</label>
          <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
            style={{ width: "100%", background: ink, border: `1px solid ${line}`, color: paper, borderRadius: 6, padding: 8, marginBottom: 16 }} />
          {msg && <div style={{ fontSize: 12, marginBottom: 12, color: msg.type === "error" ? rust : teal }}>{msg.text}</div>}
          <button type="submit" disabled={loading} style={{ width: "100%", background: brass, color: ink, border: "none", borderRadius: 6, padding: 10, fontWeight: 600, cursor: "pointer" }}>
            {loading ? "Guardando..." : "Guardar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}
