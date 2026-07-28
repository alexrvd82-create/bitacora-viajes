import { useState, useRef } from "react";
import { Share2, Download, Image as ImageIcon } from "lucide-react";
import { COUNTRY_MAP, tripKm, flagUrl } from "./data.js";

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

export default function ShareCard({ trips }) {
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

    const W = 1080, H = 1920;
    const canvas = canvasRef.current;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Fondo moderno: degradado + halo de luz
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#0a1526");
    grad.addColorStop(0.55, "#132038");
    grad.addColorStop(1, "#1a2a4a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * 0.8, 260, 40, W * 0.8, 260, 620);
    glow.addColorStop(0, "rgba(193,145,63,0.20)");
    glow.addColorStop(1, "rgba(193,145,63,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Sello decorativo (logo) en la esquina superior derecha, como un matasellos
    const logoImg = await loadImage("/logo.png");
    if (logoImg) {
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.translate(W - 190, 190);
      ctx.rotate((-9 * Math.PI) / 180);
      ctx.drawImage(logoImg, -110, -110, 220, 220);
      ctx.restore();
    }

    // Marca de la app, alineada a la izquierda
    ctx.textAlign = "left";
    ctx.fillStyle = brass;
    ctx.font = "600 26px 'IBM Plex Mono', monospace";
    ctx.fillText("BITÁCORA DE VIAJES", 70, 100);

    // Rango de fechas, tipografía grande moderna
    ctx.fillStyle = paper;
    ctx.font = "800 84px system-ui, -apple-system, sans-serif";
    const rangeText = start && end
      ? `${fmtDate(start)} — ${fmtDate(end)}`
      : sortedTrips.length ? `${fmtDate(sortedTrips[0].trip_date)} — ${fmtDate(sortedTrips[sortedTrips.length - 1].trip_date)}` : "Mi viaje";
    wrapLeftText(ctx, rangeText, 70, 220, 760, 92);

    // Línea acento
    ctx.strokeStyle = "rgba(193,145,63,0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(70, 400); ctx.lineTo(340, 400); ctx.stroke();

    let y = 560;

    // KM total — número hero, moderno (sans en vez de serif)
    ctx.textAlign = "center";
    ctx.fillStyle = brass;
    ctx.font = "800 210px system-ui, -apple-system, sans-serif";
    ctx.fillText(kmTotal.toLocaleString("es-ES"), W / 2, y);
    ctx.fillStyle = textDim;
    ctx.font = "600 32px 'IBM Plex Mono', monospace";
    ctx.fillText("KILÓMETROS RECORRIDOS", W / 2, y + 56);
    y += 150;

    // Chips de km por medio
    const modes = ["avion", "coche", "tren", "barco"].filter(m => kmByMode[m] > 0);
    const blockH = 150;
    const blockW = (W - 160 - (modes.length - 1) * 20) / Math.max(modes.length, 1);
    modes.forEach((m, i) => {
      const x = 80 + i * (blockW + 20);
      const cardGrad = ctx.createLinearGradient(x, y, x, y + blockH);
      cardGrad.addColorStop(0, "rgba(255,255,255,0.05)");
      cardGrad.addColorStop(1, "rgba(255,255,255,0.015)");
      ctx.fillStyle = cardGrad;
      roundRect(ctx, x, y, blockW, blockH, 20); ctx.fill();
      ctx.strokeStyle = "rgba(193,145,63,0.25)"; ctx.lineWidth = 1.5;
      roundRect(ctx, x, y, blockW, blockH, 20); ctx.stroke();
      ctx.textAlign = "center";
      ctx.font = "44px sans-serif";
      ctx.fillStyle = paper;
      ctx.fillText(MODE_ICONS[m], x + blockW / 2, y + 60);
      ctx.font = "800 32px system-ui, sans-serif";
      ctx.fillStyle = brass;
      ctx.fillText(kmByMode[m].toLocaleString("es-ES"), x + blockW / 2, y + 106);
      ctx.font = "600 18px 'IBM Plex Mono', monospace";
      ctx.fillStyle = textDim;
      ctx.fillText(MODE_LABELS[m], x + blockW / 2, y + 132);
    });
    y += blockH + 90;

    // Países / ciudades / tramos
    const stats = [
      { value: countrySet.size, label: "PAÍSES" },
      { value: citySet.size, label: "CIUDADES" },
      { value: filtered.length, label: "TRAMOS" },
    ];
    const sW = (W - 160) / 3;
    stats.forEach((s, i) => {
      const x = 80 + i * sW + sW / 2;
      ctx.textAlign = "center";
      ctx.font = "800 70px system-ui, sans-serif";
      ctx.fillStyle = paper;
      ctx.fillText(s.value, x, y);
      ctx.font = "600 22px 'IBM Plex Mono', monospace";
      ctx.fillStyle = textDim;
      ctx.fillText(s.label, x, y + 34);
    });
    y += 90;

    ctx.strokeStyle = inkLine; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(140, y); ctx.lineTo(W - 140, y); ctx.stroke();
    y += 60;

    // Países visitados, con banderas, abajo
    ctx.font = "600 26px 'IBM Plex Mono', monospace";
    ctx.fillStyle = textDim;
    ctx.textAlign = "center";
    ctx.fillText("PAÍSES VISITADOS", W / 2, y);
    y += 44;

    const flagW = 96, flagH = 66, gap = 20;
    const maxFlags = Math.min(countries.length, 6);
    const totalFlagsW = maxFlags * flagW + (maxFlags - 1) * gap;
    let fx = (W - totalFlagsW) / 2;
    const imgs = await Promise.all(countries.slice(0, 6).map(name => {
      const c = COUNTRY_MAP[name];
      return c ? loadImage(flagUrl(c.iso)) : Promise.resolve(null);
    }));
    imgs.forEach(img => {
      if (img) {
        ctx.save();
        roundRect(ctx, fx, y, flagW, flagH, 10); ctx.clip();
        ctx.drawImage(img, fx, y, flagW, flagH);
        ctx.restore();
        ctx.strokeStyle = "rgba(193,145,63,0.4)"; ctx.lineWidth = 1.5;
        roundRect(ctx, fx, y, flagW, flagH, 10); ctx.stroke();
      }
      fx += flagW + gap;
    });
    if (countries.length > 6) {
      ctx.textAlign = "left";
      ctx.font = "700 30px system-ui, sans-serif";
      ctx.fillStyle = brass;
      ctx.fillText(`+${countries.length - 6}`, fx + 10, y + 46);
    }

    // Pie
    ctx.textAlign = "center";
    ctx.font = "500 24px 'IBM Plex Mono', monospace";
    ctx.fillStyle = textDim;
    ctx.fillText("🌍 mi bitácora de viajes", W / 2, H - 60);

    setImgUrl(canvas.toDataURL("image/png"));
    setGenerating(false);
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
    <div style={{ background: inkPanel, border: `1px solid ${inkLine}`, borderRadius: 8, padding: 18, marginBottom: 24 }}>
      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: "0.1em", color: brass, marginBottom: 12 }}>
        COMPARTIR RESUMEN
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: 10, color: textDim, fontFamily: "'IBM Plex Mono',monospace" }}>DESDE</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)}
            style={{ display: "block", marginTop: 4, background: ink, border: `1px solid ${inkLine}`, color: paper, borderRadius: 6, padding: 8, fontSize: 12 }} />
        </div>
        <div>
          <label style={{ fontSize: 10, color: textDim, fontFamily: "'IBM Plex Mono',monospace" }}>HASTA</label>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)}
            style={{ display: "block", marginTop: 4, background: ink, border: `1px solid ${inkLine}`, color: paper, borderRadius: 6, padding: 8, fontSize: 12 }} />
        </div>
        <div style={{ alignSelf: "flex-end" }}>
          <button onClick={generate} disabled={generating || filtered.length === 0}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: brass, color: ink, border: "none", borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: "pointer", opacity: generating || filtered.length === 0 ? 0.6 : 1 }}>
            <ImageIcon size={15} /> {generating ? "Generando..." : "Generar tarjeta"}
          </button>
        </div>
      </div>
      {(!start && !end) && (
        <div style={{ fontSize: 11, color: textDim, marginBottom: 10 }}>Deja las fechas vacías para incluir todos tus viajes con fecha registrada.</div>
      )}
      {start && end && filtered.length === 0 && (
        <div style={{ fontSize: 11, color: textDim, marginBottom: 10 }}>No hay viajes con fecha en ese rango.</div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {imgUrl && (
        <div>
          <img src={imgUrl} alt="Resumen de viaje" style={{ width: "100%", maxWidth: 280, borderRadius: 8, border: `1px solid ${inkLine}`, display: "block", margin: "0 auto 14px" }} />
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={download} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "none", border: `1px solid ${inkLine}`, color: paper, borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
              <Download size={14} /> Descargar
            </button>
            <button onClick={share} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: teal, border: "none", color: paper, borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
              <Share2 size={14} /> Compartir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
