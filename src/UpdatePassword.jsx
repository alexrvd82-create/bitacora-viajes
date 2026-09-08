import { useState } from "react";
import { supabase } from "./supabaseClient";
import { useLanguage } from "./i18n/LanguageContext.jsx";

const ink = "#0a0f1e", panel = "#141b30", line = "#2a3654", paper = "#efe6d2", brass = "#c1913f", rust = "#e5484d", teal = "#4fd1c5";

export default function UpdatePassword({ onDone }) {
  const { t } = useLanguage();
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
      setMsg({ type: "ok", text: t("passwordUpdated") });
      setTimeout(onDone, 1200);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: ink, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Inter',sans-serif", color: paper }}>
      <div style={{ width: "100%", maxWidth: 360, background: panel, border: `1px solid ${line}`, borderRadius: 14, padding: 24 }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{t("newPassword")}</div>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#94a3c4", marginBottom: 20 }}>{t("choosePassword")}</div>
        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 11, color: "#94a3c4", display: "block", marginBottom: 4 }}>{t("newPasswordLabel")}</label>
          <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
            style={{ width: "100%", background: ink, border: `1px solid ${line}`, color: paper, borderRadius: 10, padding: 8, marginBottom: 16 }} />
          {msg && <div style={{ fontSize: 12, marginBottom: 12, color: msg.type === "error" ? rust : teal }}>{msg.text}</div>}
          <button type="submit" disabled={loading} style={{ width: "100%", background: brass, color: ink, border: "none", borderRadius: 10, padding: 10, fontWeight: 600, cursor: "pointer" }}>
            {loading ? t("saving") : t("savePassword")}
          </button>
        </form>
      </div>
    </div>
  );
}
