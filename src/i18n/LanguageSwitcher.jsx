import { useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react";
import { useLanguage, LANGUAGES } from "./LanguageContext.jsx";

/**
 * Compact language selector. Pass `theme` colors matching the surrounding UI
 * (ink, inkPanel, inkLine, textDim) so it blends into dark/light variants.
 */
export default function LanguageSwitcher({ theme, compact = false }) {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  const t = theme || { ink: "#0a0f1e", inkPanel: "#141b30", inkLine: "#2a3654", textDim: "#f2f0e8" };

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Language"
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "none", border: `1px solid ${t.inkLine}`, color: t.textDim,
          borderRadius: compact ? 14 : 10, padding: compact ? "0" : "8px 12px",
          width: compact ? 36 : "auto", height: compact ? 36 : "auto",
          justifyContent: "center", cursor: "pointer", fontSize: 13,
        }}
      >
        <Globe size={14} />
        {!compact && <span>{current.flag} {current.label}</span>}
      </button>
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50,
            background: t.inkPanel, border: `1px solid ${t.inkLine}`, borderRadius: 12,
            padding: 6, minWidth: 170, maxHeight: 320, overflowY: "auto",
            boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
          }}
        >
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                textAlign: "left", padding: "8px 10px", borderRadius: 8,
                background: l.code === lang ? t.inkLine : "transparent",
                border: "none", color: t.textDim, cursor: "pointer", fontSize: 13,
              }}
            >
              <span style={{ fontSize: 15 }}>{l.flag}</span> {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
