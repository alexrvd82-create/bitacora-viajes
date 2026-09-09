import { Plane, Globe2, Trophy, Share2, ArrowRight } from "lucide-react";
import { useLanguage } from "./i18n/LanguageContext.jsx";
import LanguageSwitcher from "./i18n/LanguageSwitcher.jsx";

const ink = "#0a0f1e", inkPanel = "#141b30", inkLine = "#2a3654", paper = "#efe6d2", brass = "#e8b23d", textDim = "#f2f0e8";

export default function Landing({ onStart, onLogin }) {
  const { t } = useLanguage();

  const FEATURES = [
    { Icon: Plane, title: t("feature1Title"), desc: t("feature1Desc") },
    { Icon: Globe2, title: t("feature2Title"), desc: t("feature2Desc") },
    { Icon: Trophy, title: t("feature3Title"), desc: t("feature3Desc") },
    { Icon: Share2, title: t("feature4Title"), desc: t("feature4Desc") },
  ];

  return (
    <div style={{ background: ink, minHeight: "100vh", color: paper, fontFamily: "'Inter',sans-serif" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "24px 20px 80px" }}>
        {/* Nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 56, gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo-v4.png" alt="" style={{ width: 40, height: 40, objectFit: "contain" }} />
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700 }}>{t("appName")}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LanguageSwitcher theme={{ ink, inkPanel, inkLine, textDim }} />
            <button onClick={onLogin}
              style={{ background: "none", border: `1px solid ${inkLine}`, color: textDim, borderRadius: 10, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>
              {t("login")}
            </button>
          </div>
        </div>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: "0.15em", color: brass, marginBottom: 16 }}>
            {t("heroKicker")}
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "clamp(32px, 6vw, 56px)", fontWeight: 800, lineHeight: 1.1, margin: "0 0 20px" }}>
            {t("heroTitle1")}<br />{t("heroTitle2")}
          </h1>
          <p style={{ fontSize: 17, color: textDim, maxWidth: 520, margin: "0 auto 32px", lineHeight: 1.6 }}>
            {t("heroDesc")}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onStart}
              style={{ display: "flex", alignItems: "center", gap: 8, background: brass, color: ink, border: "none", borderRadius: 12, padding: "14px 28px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
              {t("startFree")} <ArrowRight size={17} />
            </button>
          </div>
        </div>

        {/* Preview de la tarjeta compartible */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 64 }}>
          <div style={{ width: 240, background: "#0c1729", border: `1px solid ${inkLine}`, borderRadius: 18, padding: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: brass, letterSpacing: "0.1em", marginBottom: 6 }}>{t("cardBrand")}</div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 16, marginBottom: 14 }}>15 JUN — 22 JUL</div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 44, color: brass, textAlign: "center" }}>12.480</div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: textDim, textAlign: "center", marginBottom: 16 }}>{t("cardKmTraveled")}</div>
            <div style={{ display: "flex", justifyContent: "space-around", fontSize: 20 }}>
              <span>🇪🇸</span><span>🇫🇷</span><span>🇮🇹</span><span>🇬🇷</span>
            </div>
          </div>
        </div>

        {/* Features */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 64 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ background: inkPanel, border: `1px solid ${inkLine}`, borderRadius: 14, padding: 20 }}>
              <f.Icon size={22} color={brass} style={{ marginBottom: 10 }} />
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: textDim, lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center" }}>
          <button onClick={onStart}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: brass, color: ink, border: "none", borderRadius: 12, padding: "14px 28px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
            {t("createLog")} <ArrowRight size={17} />
          </button>
          <div style={{ fontSize: 12, color: textDim, marginTop: 14 }}>{t("freeNoCard")}</div>
        </div>

        <div style={{ textAlign: "center", marginTop: 48, paddingTop: 24, borderTop: `1px solid ${inkLine}` }}>
          <a href="/privacy.html" style={{ fontSize: 12, color: textDim, textDecoration: "underline" }}>Privacy Policy</a>
        </div>
      </div>
    </div>
  );
}
