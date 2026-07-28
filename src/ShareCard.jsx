import { useState, useRef } from "react";
import { Share2, Download, Image as ImageIcon } from "lucide-react";
import { COUNTRY_MAP, tripKm, flagUrl } from "./data.js";

const ink = "#101d33", inkPanel = "#16233d", inkLine = "#2b3c5c", paper = "#efe6d2", brass = "#c1913f", teal = "#3f7a76", textDim = "#94a3c4";

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

/* Construye la secuencia de paradas en orden cronológico, con el medio de transporte de cada tramo */
function buildItinerary(sortedTrips) {
  const items = [];
  sortedTrips.forEach(t => {
    t.stops.forEach((s, idx) => {
      const prev = items[items.length - 1];
      if (prev && prev.city === s.city && prev.country === s.country) return;
      items.push({ city: s.city, country: s.country, mode: idx === 0 ? null : t.mode });
    });
  });
  return items;
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
    const itinerary = buildItinerary(sortedTrips);

    const W = 1080, H = 1920;
    const canvas = canvasRef.current;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Fondo
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#0c1729");
    grad.addColorStop(1, "#16233d");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(193,145,63,0.06)";
    for (let y = 0; y < H; y += 48) for (let x = 0; x < W; x += 48) ctx.fillRect(x, y, 2, 2);

    // Marca
    ctx.fillStyle = brass;
    ctx.font = "600 30px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("BITÁCORA DE VIAJES", W / 2, 100);

    // Rango de fechas
    ctx.fillStyle = paper;
    ctx.font = "800 58px Georgia, serif";
    const rangeText = start && end
      ? `${fmtDate(start)} — ${fmtDate(end)}`
      : sortedTrips.length ? `${fmtDate(sortedTrips[0].trip_date)} — ${fmtDate(sortedTrips[sortedTrips.length - 1].trip_date)}` : "Mi viaje";
    wrapCenteredText(ctx, rangeText, W / 2, 175, W - 160, 66);

    // Itinerario tipo "pasaporte de sellos"
    const panelY = 220, panelH = 620;
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    roundRect(ctx, 40, panelY, W - 80, panelH, 20); ctx.fill();
    ctx.strokeStyle = inkLine; ctx.lineWidth = 1.5;
    roundRect(ctx, 40, panelY, W - 80, panelH, 20); ctx.stroke();

    ctx.textAlign = "center";
    ctx.font = "500 24px 'IBM Plex Mono', monospace";
    ctx.fillStyle = textDim;
    ctx.fillText("RUTA DEL VIAJE", W / 2, panelY + 50);

    const maxRows = 6;
    const shown = itinerary.slice(0, maxRows);
    const rowH = (panelH - 100) / Math.max(shown.length, 1);
    const circleX = 130, circleR = 34, textX = 200;
    const startY = panelY + 100;

    const flagImgs = await Promise.all(shown.map(item => {
      const c = COUNTRY_MAP[item.country];
      return c ? loadImage(flagUrl(c.iso)) : Promise.resolve(null);
    }));

    shown.forEach((item, i) => {
      const cy = startY + i * rowH + rowH / 2 - 20;
      // línea de conexión al siguiente
      if (i < shown.length - 1) {
        ctx.strokeStyle = "rgba(193,145,63,0.5)";
        ctx.lineWidth = 3;
        ctx.setLineDash([2, 10]);
        ctx.beginPath();
        ctx.moveTo(circleX, cy + circleR);
        ctx.lineTo(circleX, cy + rowH);
        ctx.stroke();
        ctx.setLineDash([]);
        if (item.mode == null && shown[i + 1].mode) {
          // el modo pertenece al tramo siguiente, se dibuja igual con el icono del siguiente item
        }
        const nextMode = shown[i + 1].mode;
        if (nextMode) {
          const midY = cy + (rowH + circleR) / 2 + 10;
          ctx.fillStyle = ink;
          ctx.beginPath(); ctx.arc(circleX, midY, 22, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = inkLine; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(circleX, midY, 22, 0, Math.PI * 2); ctx.stroke();
          ctx.font = "24px sans-serif";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillStyle = paper;
          ctx.fillText(MODE_ICONS[nextMode], circleX, midY + 2);
          ctx.textBaseline = "alphabetic";
        }
      }
      // círculo con bandera
      ctx.save();
      ctx.beginPath(); ctx.arc(circleX, cy, circleR, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
      if (flagImgs[i]) ctx.drawImage(flagImgs[i], circleX - circleR, cy - circleR, circleR * 2, circleR * 2);
      else { ctx.fillStyle = inkLine; ctx.fillRect(circleX - circleR, cy - circleR, circleR * 2, circleR * 2); }
      ctx.restore();
      ctx.strokeStyle = brass; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(circleX, cy, circleR, 0, Math.PI * 2); ctx.stroke();

      // texto
      ctx.textAlign = "left";
      ctx.font = "700 34px Georgia, serif";
      ctx.fillStyle = paper;
      ctx.fillText(item.city, textX, cy - 2);
      ctx.font = "400 22px 'IBM Plex Mono', monospace";
      ctx.fillStyle = textDim;
      ctx.fillText(item.country, textX, cy + 28);
    });

    if (itinerary.length > maxRows) {
      ctx.textAlign = "center";
      ctx.font = "600 24px 'IBM Plex Mono', monospace";
      ctx.fillStyle = brass;
      ctx.fillText(`+ ${itinerary.length - maxRows} paradas más`, W / 2, panelY + panelH - 20);
    }

    let y = panelY + panelH + 100;

    // KM total
    ctx.fillStyle = brass;
    ctx.font = "800 150px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(kmTotal.toLocaleString("es-ES"), W / 2, y);
    ctx.fillStyle = textDim;
    ctx.font = "500 30px 'IBM Plex Mono', monospace";
    ctx.fillText("KILÓMETROS RECORRIDOS", W / 2, y + 50);
    y += 130;

    // Bloques de km por medio
    const modes = ["avion", "coche", "tren", "barco"].filter(m => kmByMode[m] > 0);
    const blockH = 140;
    const blockW = (W - 160 - (modes.length - 1) * 20) / Math.max(modes.length, 1);
    modes.forEach((m, i) => {
      const x = 80 + i * (blockW + 20);
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      roundRect(ctx, x, y, blockW, blockH, 16); ctx.fill();
      ctx.strokeStyle = inkLine; ctx.lineWidth = 1.5;
      roundRect(ctx, x, y, blockW, blockH, 16); ctx.stroke();
      ctx.textAlign = "center";
      ctx.font = "40px sans-serif";
      ctx.fillStyle = paper;
      ctx.fillText(MODE_ICONS[m], x + blockW / 2, y + 56);
      ctx.font = "700 30px Georgia, serif";
      ctx.fillStyle = brass;
      ctx.fillText(kmByMode[m].toLocaleString("es-ES"), x + blockW / 2, y + 98);
      ctx.font = "500 18px 'IBM Plex Mono', monospace";
      ctx.fillStyle = textDim;
      ctx.fillText(MODE_LABELS[m], x + blockW / 2, y + 122);
    });
    y += blockH + 80;

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
      ctx.font = "800 64px Georgia, serif";
      ctx.fillStyle = paper;
      ctx.fillText(s.value, x, y);
      ctx.font = "500 20px 'IBM Plex Mono', monospace";
      ctx.fillStyle = textDim;
      ctx.fillText(s.label, x, y + 32);
    });
    y += 90;

    // Pie
    ctx.textAlign = "center";
    ctx.font = "500 24px 'IBM Plex Mono', monospace";
    ctx.fillStyle = textDim;
    ctx.fillText("🌍 mi bitácora de viajes", W / 2, H - 50);

    setImgUrl(canvas.toDataURL("image/png"));
    setGenerating(false);
  }

  function fmtDate(d) {
    const [y, m, day] = d.split("-");
    const months = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
    return `${parseInt(day)} ${months[parseInt(m) - 1]}`;
  }

  function wrapCenteredText(ctx, text, cx, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "", lines = [];
    words.forEach(w => {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
      else line = test;
    });
    lines.push(line);
    lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lineHeight));
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
