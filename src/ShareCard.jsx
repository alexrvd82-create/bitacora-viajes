import { useState, useRef } from "react";
import { Share2, Download, Image as ImageIcon } from "lucide-react";
import { COUNTRY_MAP, tripKm, flagUrl, TOTAL_COUNTRIES } from "./data.js";

// Colores de la propia tarjeta generada (imagen): se queda con su estilo oscuro de marca
// siempre, para que se vea igual la compartas desde el tema claro o el oscuro de la app.
// Colores de la propia tarjeta generada (imagen), en versión clara y oscura, según el tema de la app.
const CARD_THEMES = {
  dark: {
    bgStops: ["#0a1526", "#132038", "#1a2a4a"],
    brassRGB: "193,145,63", tealRGB: "95,212,196",
    ink: "#0c1729", inkLine: "#2b3c5c",
    paper: "#efe6d2", brass: "#c1913f", textDim: "#c7d0e6",
    blockOverlay: ["rgba(255,255,255,0.07)", "rgba(255,255,255,0.02)"],
  },
  light: {
    bgStops: ["#fbf4e5", "#f3e7cd", "#ecdca8"],
    brassRGB: "138,90,30", tealRGB: "13,110,99",
    ink: "#f6efe0", inkLine: "#c9b280",
    paper: "#241a08", brass: "#8a5a1e", textDim: "#5c4d30",
    blockOverlay: ["rgba(255,255,255,0.55)", "rgba(255,255,255,0.25)"],
  },
};
// (colores usados solo por el panel de controles de la web, no por la imagen generada)
const ink = "#0c1729", inkPanel = "#16233d", inkLine = "#2b3c5c", paper = "#efe6d2", brass = "#c1913f", teal = "#3f7a76", textDim = "#94a3c4";

const MODE_ICONS = { avion: "✈", coche: "🚗", tren: "🚆", barco: "⛴" };
const MODE_LABELS = { avion: "AVIÓN", coche: "COCHE", tren: "TREN", barco: "BARCO" };

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default function ShareCard({ trips, theme, dark = true }) {
  const ui = theme || { ink, inkPanel, inkLine, paper, brass, teal, textDim };
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [imgUrl, setImgUrl] = useState(null);
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef(null);

  const filtered = trips.filter(t => {
    if (!t.trip_date) return false;
    if (start && t.trip_date < start) return false;
    if (end && t.trip_date > end) return false;
    return true;
  });

  async function generate() {
    setGenerating(true);
    const C = CARD_THEMES[dark ? "dark" : "light"];
    const sortedTrips = [...filtered].sort((a, b) => (a.trip_date || "").localeCompare(b.trip_date || ""));
    const countrySet = new Set(), citySet = new Set();
    const kmByMode = { avion: 0, coche: 0, tren: 0, barco: 0 };
    filtered.forEach(t => {
      t.stops.forEach(s => { countrySet.add(s.country); citySet.add(`${s.city}, ${s.country}`); });
      const km = tripKm(t);
      if (km != null) kmByMode[t.mode] += km;
    });
    const kmTotal = Object.values(kmByMode).reduce((a, b) => a + b, 0);
    const countries = [...countrySet];

    // Cobertura mundial de toda la vida (todos los viajes, no solo el rango de fechas elegido)
    const lifetimeCountrySet = new Set();
    trips.forEach(t => t.stops.forEach(s => lifetimeCountrySet.add(s.country)));
    const lifetimePct = (lifetimeCountrySet.size / TOTAL_COUNTRIES) * 100;

    const W = 1080, H = 1920;
    const canvas = canvasRef.current;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Fondo moderno: degradado + halo de luz
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, C.bgStops[0]);
    grad.addColorStop(0.55, C.bgStops[1]);
    grad.addColorStop(1, C.bgStops[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * 0.78, 300, 40, W * 0.78, 300, 650);
    glow.addColorStop(0, `rgba(${C.brassRGB},${dark ? 0.22 : 0.16})`);
    glow.addColorStop(1, `rgba(${C.brassRGB},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Marca de la app
    ctx.textAlign = "left";
    ctx.fillStyle = C.brass;
    ctx.font = "700 30px 'IBM Plex Mono', monospace";
    ctx.fillText("BITÁCORA DE VIAJES", 70, 100);

    // Rango de fechas, tipografía grande moderna (ancho recortado para dejar sitio al sello)
    ctx.fillStyle = C.paper;
    const rangeText = start && end
      ? `${fmtDate(start)} — ${fmtDate(end)}`
      : sortedTrips.length ? `${fmtDate(sortedTrips[0].trip_date)} — ${fmtDate(sortedTrips[sortedTrips.length - 1].trip_date)}` : "Mi viaje";
    const rangeSize = fitFontSize(ctx, rangeText, 560, 108, s => `800 ${s}px system-ui, -apple-system, sans-serif`);
    ctx.font = `800 ${rangeSize}px system-ui, -apple-system, sans-serif`;
    wrapLeftText(ctx, rangeText, 70, 250, 600, rangeSize * 1.15);

    // Sello decorativo (logo), separado del texto de fecha
    const logoImg = await loadImage("/logo-v4.png");
    if (logoImg) {
      ctx.save();
      ctx.globalAlpha = dark ? 0.92 : 0.85;
      ctx.translate(W - 155, 195);
      ctx.rotate((-9 * Math.PI) / 180);
      ctx.drawImage(logoImg, -105, -105, 210, 210);
      ctx.restore();
    }

    // Línea acento
    ctx.strokeStyle = `rgba(${C.brassRGB},0.55)`;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(70, 460); ctx.lineTo(360, 460); ctx.stroke();

    let y = 690;

    // KM total — número hero, grande, se autoajusta para no salirse
    ctx.textAlign = "center";
    ctx.fillStyle = C.brass;
    const kmText = kmTotal.toLocaleString("es-ES");
    const kmSize = fitFontSize(ctx, kmText, 940, 260, s => `800 ${s}px system-ui, -apple-system, sans-serif`);
    ctx.font = `800 ${kmSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(kmText, W / 2, y);
    ctx.fillStyle = C.textDim;
    ctx.font = "800 40px 'IBM Plex Mono', monospace";
    ctx.fillText("KILÓMETROS RECORRIDOS", W / 2, y + 66);
    y += 200;

    // Chips de km por medio
    const modes = ["avion", "coche", "tren", "barco"].filter(m => kmByMode[m] > 0);
    const blockH = 210;
    const blockW = (W - 160 - (modes.length - 1) * 22) / Math.max(modes.length, 1);
    modes.forEach((m, i) => {
      const x = 80 + i * (blockW + 22);
      const cardGrad = ctx.createLinearGradient(x, y, x, y + blockH);
      cardGrad.addColorStop(0, C.blockOverlay[0]);
      cardGrad.addColorStop(1, C.blockOverlay[1]);
      ctx.fillStyle = cardGrad;
      roundRect(ctx, x, y, blockW, blockH, 22); ctx.fill();
      ctx.strokeStyle = `rgba(${C.brassRGB},0.35)`; ctx.lineWidth = 2;
      roundRect(ctx, x, y, blockW, blockH, 22); ctx.stroke();
      ctx.textAlign = "center";
      ctx.font = "84px sans-serif";
      ctx.fillStyle = C.paper;
      ctx.fillText(MODE_ICONS[m], x + blockW / 2, y + 96);
      const modeKmText = kmByMode[m].toLocaleString("es-ES");
      const modeKmSize = fitFontSize(ctx, modeKmText, blockW - 20, 46, s => `800 ${s}px system-ui, sans-serif`);
      ctx.font = `800 ${modeKmSize}px system-ui, sans-serif`;
      ctx.fillStyle = C.brass;
      ctx.fillText(modeKmText, x + blockW / 2, y + 154);
      ctx.font = "800 25px 'IBM Plex Mono', monospace";
      ctx.fillStyle = C.textDim;
      ctx.fillText(MODE_LABELS[m], x + blockW / 2, y + 188);
    });
    y += blockH + 110;

    // Países / ciudades / tramos
    const mint = "#5fd4c4", coral = "#e8916a";
    const stats = [
      { value: countrySet.size, label: "PAÍSES", accent: C.brass },
      { value: citySet.size, label: "CIUDADES", accent: mint },
      { value: filtered.length, label: "TRAYECTOS", accent: coral },
    ];
    const sW = (W - 160) / 3;
    stats.forEach((s, i) => {
      const x = 80 + i * sW + sW / 2;
      ctx.textAlign = "center";
      ctx.fillStyle = s.accent;
      roundRect(ctx, x - 16, y - 90, 32, 6, 3); ctx.fill();
      ctx.font = "800 96px system-ui, sans-serif";
      ctx.fillStyle = C.paper;
      ctx.fillText(s.value, x, y);
      ctx.font = "800 29px 'IBM Plex Mono', monospace";
      ctx.fillStyle = C.textDim;
      ctx.fillText(s.label, x, y + 42);
    });
    y += 110;

    ctx.strokeStyle = C.inkLine; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(140, y); ctx.lineTo(W - 140, y); ctx.stroke();
    y += 70;

    // Países visitados, con banderas
    ctx.font = "800 31px 'IBM Plex Mono', monospace";
    ctx.fillStyle = C.textDim;
    ctx.textAlign = "center";
    ctx.fillText("PAÍSES VISITADOS EN ESTE PERIODO", W / 2, y);
    y += 56;

    const flagW = 150, flagH = 102, gap = 26;
    const maxFlags = Math.min(countries.length, 5);
    const totalFlagsW = maxFlags * flagW + (maxFlags - 1) * gap;
    let fx = (W - totalFlagsW) / 2;
    const imgs = await Promise.all(countries.slice(0, 5).map(name => {
      const c = COUNTRY_MAP[name];
      return c ? loadImage(flagUrl(c.iso)) : Promise.resolve(null);
    }));
    imgs.forEach(img => {
      if (img) {
        ctx.save();
        roundRect(ctx, fx, y, flagW, flagH, 14); ctx.clip();
        ctx.drawImage(img, fx, y, flagW, flagH);
        ctx.restore();
        ctx.strokeStyle = `rgba(${C.brassRGB},0.5)`; ctx.lineWidth = 2;
        roundRect(ctx, fx, y, flagW, flagH, 14); ctx.stroke();
      }
      fx += flagW + gap;
    });
    if (countries.length > 5) {
      ctx.textAlign = "left";
      ctx.font = "800 40px system-ui, sans-serif";
      ctx.fillStyle = C.brass;
      ctx.fillText(`+${countries.length - 5}`, fx + 14, y + 62);
    }
    y += flagH + 60;

    // Cobertura mundial de toda la vida — bloque destacado, debajo de las banderas del periodo
    const covH = 190;
    const covGrad = ctx.createLinearGradient(80, y, W - 80, y);
    covGrad.addColorStop(0, `rgba(${C.brassRGB},0.16)`);
    covGrad.addColorStop(1, `rgba(${C.tealRGB},0.12)`);
    ctx.fillStyle = covGrad;
    roundRect(ctx, 80, y, W - 160, covH, 26); ctx.fill();
    ctx.strokeStyle = `rgba(${C.brassRGB},0.4)`; ctx.lineWidth = 2;
    roundRect(ctx, 80, y, W - 160, covH, 26); ctx.stroke();

    ctx.textAlign = "center";
    ctx.font = "800 26px 'IBM Plex Mono', monospace";
    ctx.fillStyle = C.textDim;
    ctx.fillText("DESDE QUE EMPECÉ A VIAJAR", W / 2, y + 48);
    ctx.font = "800 96px system-ui, sans-serif";
    ctx.fillStyle = C.brass;
    ctx.fillText(`${lifetimePct.toFixed(1)}%`, W / 2, y + 138);
    ctx.font = "700 26px 'IBM Plex Mono', monospace";
    ctx.fillStyle = C.paper;
    ctx.fillText(`${lifetimeCountrySet.size} de ${TOTAL_COUNTRIES} países del mundo`, W / 2, y + 172);
    y += covH + 60;

    // Pie
    ctx.textAlign = "center";
    ctx.font = "700 28px 'IBM Plex Mono', monospace";
    ctx.fillStyle = C.textDim;
    ctx.fillText("🌍 mi bitácora de viajes", W / 2, H - 60);
    ctx.font = "700 22px 'IBM Plex Mono', monospace";
    ctx.fillStyle = C.brass;
    ctx.fillText("bitacora-viajes-arvd.vercel.app", W / 2, H - 28);

    setImgUrl(canvas.toDataURL("image/png"));
    setGenerating(false);
  }

  function fitFontSize(ctx, text, maxWidth, startSize, fontSpec) {
    let size = startSize;
    ctx.font = fontSpec(size);
    while (size > 40 && ctx.measureText(text).width > maxWidth) {
      size -= 6;
      ctx.font = fontSpec(size);
    }
    return size;
  }

  function fmtDate(d) {
    const [y, m, day] = d.split("-");
    const months = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
    return `${parseInt(day)} ${months[parseInt(m) - 1]}`;
  }

  function wrapLeftText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "", lines = [];
    words.forEach(w => {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
      else line = test;
    });
    lines.push(line);
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  }

  function download() {
    const a = document.createElement("a");
    a.href = imgUrl; a.download = "bitacora-viajes.png";
    a.click();
  }

  async function share() {
    const res = await fetch(imgUrl);
    const blob = await res.blob();
    const file = new File([blob], "bitacora-viajes.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "Mi bitácora de viajes" });
    } else {
      download();
    }
  }

  return (
    <div style={{ background: ui.inkPanel, border: `1px solid ${ui.inkLine}`, borderRadius: 14, padding: 18, marginBottom: 24 }}>
      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: "0.1em", color: ui.brass, marginBottom: 12 }}>
        COMPARTIR RESUMEN
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: 10, color: ui.textDim, fontFamily: "'IBM Plex Mono',monospace" }}>DESDE</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)}
            style={{ display: "block", marginTop: 4, background: ui.ink, border: `1px solid ${ui.inkLine}`, color: ui.paper, borderRadius: 10, padding: 8, fontSize: 12 }} />
        </div>
        <div>
          <label style={{ fontSize: 10, color: ui.textDim, fontFamily: "'IBM Plex Mono',monospace" }}>HASTA</label>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)}
            style={{ display: "block", marginTop: 4, background: ui.ink, border: `1px solid ${ui.inkLine}`, color: ui.paper, borderRadius: 10, padding: 8, fontSize: 12 }} />
        </div>
        <div style={{ alignSelf: "flex-end" }}>
          <button onClick={generate} disabled={generating || filtered.length === 0}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: ui.brass, color: ui.ink, border: "none", borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: "pointer", opacity: generating || filtered.length === 0 ? 0.6 : 1 }}>
            <ImageIcon size={15} /> {generating ? "Generando..." : "Generar tarjeta"}
          </button>
        </div>
      </div>
      {(!start && !end) && (
        <div style={{ fontSize: 11, color: ui.textDim, marginBottom: 10 }}>Deja las fechas vacías para incluir todos tus viajes con fecha registrada.</div>
      )}
      {start && end && filtered.length === 0 && (
        <div style={{ fontSize: 11, color: ui.textDim, marginBottom: 10 }}>No hay viajes con fecha en ese rango.</div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {imgUrl && (
        <div>
          <img src={imgUrl} alt="Resumen de viaje" style={{ width: "100%", maxWidth: 280, borderRadius: 14, border: `1px solid ${ui.inkLine}`, display: "block", margin: "0 auto 14px" }} />
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={download} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "none", border: `1px solid ${ui.inkLine}`, color: ui.paper, borderRadius: 10, cursor: "pointer", fontSize: 13 }}>
              <Download size={14} /> Descargar
            </button>
            <button onClick={share} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: ui.teal, border: "none", color: ui.ink === "#efe6d2" ? "#efe6d2" : "#fff", borderRadius: 10, cursor: "pointer", fontSize: 13 }}>
              <Share2 size={14} /> Compartir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
