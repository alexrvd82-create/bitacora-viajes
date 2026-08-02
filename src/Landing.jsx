import { Plane, Globe2, Trophy, Share2, ArrowRight } from "lucide-react";

const ink = "#0a0f1e", inkPanel = "#141b30", inkLine = "#2a3654", paper = "#efe6d2", brass = "#e8b23d", textDim = "#f2f0e8";

const FEATURES = [
  { Icon: Plane, title: "Cada viaje, con km reales", desc: "Avión, coche, tren o barco. Distancias calculadas de verdad, no aproximadas." },
  { Icon: Globe2, title: "Tu cobertura del mundo", desc: "Mapa interactivo y % de países, continentes y ciudades visitadas." },
  { Icon: Trophy, title: "Insignias por objetivos", desc: "100.000 km, 10 países, 6 continentes... desbloquea logros a medida que viajas." },
  { Icon: Share2, title: "Tarjeta para compartir", desc: "Genera una imagen tipo Instagram Story con el resumen de tu viaje, lista para publicar." },
];

export default function Landing({ onStart, onLogin }) {
  return (
    <div style={{ background: ink, minHeight: "100vh", color: paper, fontFamily: "'Inter',sans-serif" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "24px 20px 80px" }}>
        {/* Nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo-v4.png" alt="" style={{ width: 40, height: 40, objectFit: "contain" }} />
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700 }}>Bitácora de viajes</span>
          </div>
          <button onClick={onLogin}
            style={{ background: "none", border: `1px solid ${inkLine}`, color: textDim, borderRadius: 10, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>
            Iniciar sesión
          </button>
        </div>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: "0.15em", color: brass, marginBottom: 16 }}>
            REGISTRO DE VIAJES · GRATIS
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "clamp(32px, 6vw, 56px)", fontWeight: 800, lineHeight: 1.1, margin: "0 0 20px" }}>
            Tu vida en kilómetros.<br />Lista para compartir.
          </h1>
          <p style={{ fontSize: 17, color: textDim, maxWidth: 520, margin: "0 auto 32px", lineHeight: 1.6 }}>
            Registra cada viaje, mira cuánto mundo has recorrido de verdad, y genera una tarjeta
            para presumirlo en redes en un clic.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onStart}
              style={{ display: "flex", alignItems: "center", gap: 8, background: brass, color: ink, border: "none", borderRadius: 12, padding: "14px 28px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
              Empezar gratis <ArrowRight size={17} />
            </button>
          </div>
        </div>

        {/* Preview de la tarjeta compartible */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 64 }}>
          <div style={{ width: 240, background: "#0c1729", border: `1px solid ${inkLine}`, borderRadius: 18, padding: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: brass, letterSpacing: "0.1em", marginBottom: 6 }}>BITÁCORA DE VIAJES</div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 16, marginBottom: 14 }}>15 JUN — 22 JUL</div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 44, color: brass, textAlign: "center" }}>12.480</div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: textDim, textAlign: "center", marginBottom: 16 }}>KILÓMETROS RECORRIDOS</div>
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
            Crear mi bitácora <ArrowRight size={17} />
          </button>
          <div style={{ fontSize: 12, color: textDim, marginTop: 14 }}>Gratis. Sin tarjeta de crédito.</div>
        </div>
      </div>
    </div>
  );
}
