import { useState, useRef } from "react";
import Plotly from "plotly.js-dist-min";
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

/* Interpola puntos a lo largo del círculo máximo entre dos coordenadas, para dibujar un arco de ruta */
function greatCirclePoints(lat1, lon1, lat2, lon2, n = 40) {
  const toRad = d => (d * Math.PI) / 180, toDeg = r => (r * 180) / Math.PI;
  const φ1 = toRad(lat1), λ1 = toRad(lon1), φ2 = toRad(lat2), λ2 = toRad(lon2);
  const d = 2 * Math.asin(Math.sqrt(Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2));
  if (d === 0) return [[lat1, lon1]];
  const points = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);
    const φ = Math.atan2(z, Math.sqrt(x * x + y * y)), λ = Math.atan2(y, x);
    points.push([toDeg(φ), toDeg(λ)]);
  }
  return points;
}

export default function ShareCard({ trips }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [imgUrl, setImgUrl] = useState(null);
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef(null);
  const plotlyHostRef = useRef(null);

  const filtered = trips.filter(t => {
    if (!t.trip_date) return false;
    if (start && t.trip_date < start) return false;
    if (end && t.trip_date > end) return false;
    return true;
  });

  async function renderRouteMap() {
    const lineTraces = [];
    const pointsLon = [], pointsLat = [], pointsText = [];
    filtered.forEach(t => {
      const stops = t.stops.filter(s => s.lat != null && s.lon != null);
      for (let i = 0; i < stops.length - 1; i++) {
        const pts = greatCirclePoints(stops[i].lat, stops[i].lon, stops[i + 1].lat, stops[i + 1].lon);
        lineTraces.push({
          type: "scattergeo", mode: "lines",
          lat: pts.map(p => p[0]), lon: pts.map(p => p[1]),
          line: { width: 2.5, color: "rgba(193,145,63,0.85)" },
          hoverinfo: "skip", showlegend: false,
        });
      }
      stops.forEach(s => { pointsLon.push(s.lon); pointsLat.push(s.lat); pointsText.push(s.city); });
    });

    const markerTrace = {
      type: "scattergeo", mode: "markers",
      lat: pointsLat, lon: pointsLon, text: pointsText, hoverinfo: "skip",
      marker: { size: 7, color: "#efe6d2", line: { width: 1.5, color: "#101d33" } },
      showlegend: false,
    };

    const host = plotlyHostRef.current;
    await Plotly.newPlot(host, [...lineTraces, markerTrace], {
      geo: {
        projection: { type: "natural earth" },
        showframe: false, showcoastlines: false, showcountries: false,
        showocean: true, oceancolor: "#101d33", landcolor: "#22335a", bgcolor: "transparent",
      },
      paper_bgcolor: "transparent", plot_bgcolor: "transparent",
      margin: { t: 0, b: 0, l: 0, r: 0 }, width: 1000, height: 640,
    }, { staticPlot: true, displayModeBar: false });

    const dataUrl = await Plotly.toImage(host, { format: "png", width: 1000, height: 640 });
    Plotly.purge(host);
    return dataUrl;
  }

  async function generate() {
    setGenerating(true);
    const countrySet = new Set(), citySet = new Set();
    const kmByMode = { avion: 0, coche: 0, tren: 0, barco: 0 };
    filtered.forEach(t => {
      t.stops.forEach(s => { countrySet.add(s.country); citySet.add(`${s.city}, ${s.country}`); });
      const km = tripKm(t);
      if (km != null) kmByMode[t.mode] += km;
    });
    const kmTotal = Object.values(kmByMode).reduce((a, b) => a + b, 0);
    const countries = [...countrySet];
    const hasRoutePoints = filtered.some(t => t.stops.some(s => s.lat != null));

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
      : filtered.length ? `${fmtDate(filtered[filtered.length - 1].trip_date)} — ${fmtDate(filtered[0].trip_date)}` : "Mi viaje";
    wrapCenteredText(ctx, rangeText, W / 2, 175, W - 160, 66);

    // Mapa de ruta
    const mapY = 220, mapH = 620;
    if (hasRoutePoints) {
      const mapDataUrl = await renderRouteMap();
      const mapImg = await loadImage(mapDataUrl);
      if (mapImg) {
        ctx.save();
        roundRect(ctx, 40, mapY, W - 80, mapH, 20);
        ctx.clip();
        ctx.fillStyle = "#101d33";
        ctx.fillRect(40, mapY, W - 80, mapH);
        ctx.drawImage(mapImg, 40, mapY, W - 80, mapH);
        ctx.restore();
        ctx.strokeStyle = inkLine; ctx.lineWidth = 1.5;
        roundRect(ctx, 40, mapY, W - 80, mapH, 20); ctx.stroke();
      }
    }

    let y = mapY + mapH + 100;

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
    y += 80;

    ctx.strokeStyle = inkLine; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(140, y); ctx.lineTo(W - 140, y); ctx.stroke();
    y += 60;

    // Banderas
    ctx.font = "500 24px 'IBM Plex Mono', monospace";
    ctx.fillStyle = textDim;
    ctx.textAlign = "center";
    ctx.fillText("PAÍSES VISITADOS", W / 2, y);
    y += 40;

    const flagW = 90, flagH = 62, gap = 18;
    const maxFlags = Math.min(countries.length, 6);
    const totalFlagsW = maxFlags * flagW + (maxFlags - 1) * gap;
    let fx = (W - totalFlagsW) / 2;
    const imgs = await Promise.all(countries.slice(0, 6).map(name => {
      const c = COUNTRY_MAP[name];
      return c ? loadImage(flagUrl(c.iso)) : Promise.resolve(null);
    }));
    imgs.forEach(img => {
      if (img) { roundRect(ctx, fx, y, flagW, flagH, 8); ctx.save(); ctx.clip(); ctx.drawImage(img, fx, y, flagW, flagH); ctx.restore(); }
      fx += flagW + gap;
    });
    if (countries.length > 6) {
      ctx.textAlign = "left";
      ctx.font = "700 26px Georgia, serif";
      ctx.fillStyle = brass;
      ctx.fillText(`+${countries.length - 6}`, fx + 10, y + 42);
    }

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
      <div ref={plotlyHostRef} style={{ position: "absolute", left: -9999, top: -9999, width: 1000, height: 640 }} />

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
