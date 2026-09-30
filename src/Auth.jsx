import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import { track } from "./analytics.js";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "./i18n/LanguageContext.jsx";
import LanguageSwitcher from "./i18n/LanguageSwitcher.jsx";

const ink = "#0a0f1e", panel = "#141b30", line = "#2a3654", paper = "#efe6d2", brass = "#c1913f", rust = "#e5484d", teal = "#4fd1c5";

// ID de cliente de Google (es público, no es un secreto). Si no está definido,
// el login usa la redirección clásica de Supabase como antes.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.getElementById("google-gsi");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const sc = document.createElement("script");
    sc.id = "google-gsi";
    sc.src = "https://accounts.google.com/gsi/client";
    sc.async = true;
    sc.defer = true;
    sc.onload = () => resolve();
    sc.onerror = reject;
    document.head.appendChild(sc);
  });
}

async function makeNonce() {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  return { raw, hashed };
}

export default function Auth({ initialMode = "login", onBack }) {
  const { t, lang } = useLanguage();
  const googleBtnRef = useRef(null);
  const [googleMode, setGoogleMode] = useState(GOOGLE_CLIENT_ID ? "gis" : "redirect"); // "gis" = popup de Google | "redirect" = vía Supabase
  const [mode, setMode] = useState(initialMode); // "login" | "signup" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (googleMode !== "gis") return;
    let cancelled = false;
    (async () => {
      try {
        await loadGoogleScript();
        if (cancelled || !googleBtnRef.current) return;
        const nonce = await makeNonce();
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: nonce.hashed,
          callback: async (resp) => {
            setMsg(null);
            const { error } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: resp.credential,
              nonce: nonce.raw,
            });
            if (error) setMsg({ type: "error", text: error.message });
            else track("login_google_success");
          },
        });
        const el = googleBtnRef.current;
        el.innerHTML = "";
        window.google.accounts.id.renderButton(el, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          width: Math.min(320, Math.floor(el.offsetWidth) || 280),
          locale: lang,
        });
      } catch (e) {
        if (!cancelled) setGoogleMode("redirect"); // si Google no carga, vuelve al método clásico
      }
    })();
    return () => { cancelled = true; };
  }, [googleMode, lang]);

  async function handleGoogle() {
    setMsg(null);
    track("login_google_click");
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
      else track("login_success");
    } else if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMsg({ type: "error", text: error.message });
      else { setMsg({ type: "ok", text: t("signupSuccess") }); track("signup_success"); }
    } else if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) setMsg({ type: "error", text: error.message });
      else setMsg({ type: "ok", text: t("resetSent") });
    }
    setLoading(false);
  }

  const title = mode === "login" ? t("authLogin") : mode === "signup" ? t("authSignup") : t("authForgot");

  return (
    <div style={{ minHeight: "100vh", background: ink, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Inter',sans-serif", color: paper }}>
      <div style={{ width: "100%", maxWidth: 360, background: panel, border: `1px solid ${line}`, borderRadius: 14, padding: 24, position: "relative" }}>
        {onBack && (
          <button onClick={onBack} aria-label={t("back")}
            style={{ position: "absolute", top: 16, left: 16, background: "none", border: "none", color: "#94a3c4", cursor: "pointer", display: "flex" }}>
            <ArrowLeft size={18} />
          </button>
        )}
        <div style={{ position: "absolute", top: 16, right: 16 }}>
          <LanguageSwitcher theme={{ ink, inkPanel: panel, inkLine: line, textDim: "#94a3c4" }} compact />
        </div>
        <img src="/logo-v4.png" alt={t("appName")} style={{ width: 90, height: 90, display: "block", margin: "0 auto 12px" }} />
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 800, marginBottom: 4, textAlign: "center" }}>{t("appName")}</div>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#94a3c4", marginBottom: 20, textAlign: "center" }}>{title}</div>

        {googleMode === "gis" ? (
          <div ref={googleBtnRef} style={{ display: "flex", justifyContent: "center", minHeight: 44, marginBottom: 16, colorScheme: "light" }} />
        ) : (
          <button type="button" onClick={handleGoogle}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#fff", color: "#1f1f1f", border: "none", borderRadius: 10, padding: 10, fontWeight: 600, cursor: "pointer", marginBottom: 16, fontSize: 14 }}>
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z"/></svg>
            {t("continueGoogle")}
          </button>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: line }} />
          <span style={{ fontSize: 11, color: "#94a3c4" }}>{t("orEmail")}</span>
          <div style={{ flex: 1, height: 1, background: line }} />
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 11, color: "#94a3c4", display: "block", marginBottom: 4 }}>{t("email")}</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            style={{ width: "100%", background: ink, border: `1px solid ${line}`, color: paper, borderRadius: 10, padding: 8, marginBottom: 12 }} />

          {mode !== "forgot" && (
            <>
              <label style={{ fontSize: 11, color: "#94a3c4", display: "block", marginBottom: 4 }}>{t("password")}</label>
              <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                style={{ width: "100%", background: ink, border: `1px solid ${line}`, color: paper, borderRadius: 10, padding: 8, marginBottom: 8 }} />
            </>
          )}

          {mode === "login" && (
            <div style={{ textAlign: "right", marginBottom: 16 }}>
              <button type="button" onClick={() => { setMode("forgot"); setMsg(null); }}
                style={{ background: "none", border: "none", color: "#94a3c4", cursor: "pointer", fontSize: 12, padding: 0, textDecoration: "underline" }}>
                {t("forgotPassword")}
              </button>
            </div>
          )}
          {mode !== "login" && <div style={{ marginBottom: 16 }} />}

          {msg && (
            <div style={{ fontSize: 12, marginBottom: 12, color: msg.type === "error" ? rust : teal }}>{msg.text}</div>
          )}

          <button type="submit" disabled={loading} style={{ width: "100%", background: brass, color: ink, border: "none", borderRadius: 10, padding: 10, fontWeight: 600, cursor: "pointer" }}>
            {loading ? t("submitting") : mode === "login" ? t("enter") : mode === "signup" ? t("signUp") : t("sendResetLink")}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#94a3c4" }}>
          {mode === "login" && (
            <>{t("noAccount")}{" "}
              <button onClick={() => { setMode("signup"); setMsg(null); }} style={{ background: "none", border: "none", color: brass, cursor: "pointer", padding: 0, font: "inherit" }}>{t("signUpHere")}</button>
            </>
          )}
          {mode === "signup" && (
            <>{t("haveAccount")}{" "}
              <button onClick={() => { setMode("login"); setMsg(null); }} style={{ background: "none", border: "none", color: brass, cursor: "pointer", padding: 0, font: "inherit" }}>{t("loginHere")}</button>
            </>
          )}
          {mode === "forgot" && (
            <button onClick={() => { setMode("login"); setMsg(null); }} style={{ background: "none", border: "none", color: brass, cursor: "pointer", padding: 0, font: "inherit" }}>{t("backToLogin")}</button>
          )}
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "#94a3c4", opacity: 0.6, fontFamily: "'IBM Plex Mono',monospace" }}>
        © 2026 ARVD
      </div>
    </div>
  );
}
