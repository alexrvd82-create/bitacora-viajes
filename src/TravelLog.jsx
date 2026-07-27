import { useState, useEffect, useMemo, useRef } from "react";
import Plot from "react-plotly.js";
import { Plane, Car, TrainFront, Ship, Trash2, MapPin, Globe2, Plus, X, Trophy, Lock, LogOut } from "lucide-react";
import { supabase } from "./supabaseClient";
import {
  COUNTRIES, COUNTRY_MAP, CONTINENTS, CONT_TOTALS, TOTAL_COUNTRIES,
  MODE_LABELS, BADGES, flagUrl, tripKm, resolveStopCoords, computeTripKm, searchCities,
} from "./data.js";

const MODES = [
  { id: "avion", label: "Avión", Icon: Plane },
  { id: "coche", label: "Coche", Icon: Car },
  { id: "tren", label: "Tren", Icon: TrainFront },
  { id: "barco", label: "Barco", Icon: Ship },
];

const ink = "#101d33", inkPanel = "#16233d", inkLine = "#2b3c5c", paper = "#efe6d2", brass = "#c1913f", teal = "#3f7a76", rust = "#b2453f", textDim = "#94a3c4";
const emptyStops = () => [{ country: "España", city: "" }, { country: "Francia", city: "" }];

export default function TravelLog({ session }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stops, setStops] = useState(emptyStops());
  const [mode, setMode] = useState("avion");
  const [date, setDate] = useState("");
  const [roundTrip, setRoundTrip] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalcId, setRecalcId] = useState(null);
  const [suggestions, setSuggestions] = useState({}); // { [stopIndex]: [{name, admin1, country, country_code, lat, lon}] }
  const [openSuggestIndex, setOpenSuggestIndex] = useState(null);
  const debounceRef = useRef({});

  useEffect(() => { loadTrips(); }, []);

  async function loadTrips() {
    setLoading(true);
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setTrips(data || []);
    setLoading(false);
  }

  function selectMode(id) {
    setMode(id);
    if (id === "avion") setStops(prev => (prev.length > 2 ? [prev[0], prev[prev.length - 1]] : prev));
  }

  function addStop() {
    setStops(prev => {
      const last = prev[prev.length - 1];
      return [...prev.slice(0, -1), { country: last.country, city: "" }, last];
    });
  }
  function removeStop(index) {
    setStops(prev => (prev.length > 2 ? prev.filter((_, i) => i !== index) : prev));
  }
  function updateStop(index, field, value) {
    setStops(prev => prev.map((s, i) => (i === index ? { ...s, [field]: value, ...(field === "city" ? { lat: undefined, lon: undefined } : {}) } : s)));
    if (field === "city") {
      clearTimeout(debounceRef.current[index]);
      debounceRef.current[index] = setTimeout(async () => {
        const results = await searchCities(value);
        setSuggestions(prev => ({ ...prev, [index]: results }));
        setOpenSuggestIndex(results.length > 0 ? index : null);
      }, 350);
    }
  }

  function selectSuggestion(index, sug) {
    const countryMatch = COUNTRIES.find(c => c.iso === sug.country_code);
    setStops(prev => prev.map((s, i) => (i === index
      ? { ...s, city: sug.name, country: countryMatch ? countryMatch.name : s.country, lat: sug.lat, lon: sug.lon }
      : s)));
    setOpenSuggestIndex(null);
    setSuggestions(prev => ({ ...prev, [index]: [] }));
  }

  async function addTrip() {
    if (stops.some(s => !s.city.trim())) return;
    setSaving(true);
    const cleanStops = stops.map(s => ({
      country: s.country, city: s.city.trim(),
      ...(s.lat != null && s.lon != null ? { lat: s.lat, lon: s.lon } : {}),
    }));
    const resolvedStops = await Promise.all(cleanStops.map(resolveStopCoords));
    const km = await computeTripKm(mode, resolvedStops);
    const payload = {
      user_id: session.user.id,
      trip_date: date || null,
      mode,
      round_trip: roundTrip,
      stops: resolvedStops,
      km,
    };
    const { data, error } = await supabase.from("trips").insert(payload).select().single();
    if (!error && data) setTrips(prev => [data, ...prev]);
    setStops(prev => (prev.length > 2 ? emptyStops() : prev.map(s => ({ ...s, city: "", lat: undefined, lon: undefined }))));
    setDate("");
    setSaving(false);
  }

  async function recalcTrip(t) {
    setRecalcId(t.id);
    const resolvedStops = await Promise.all(t.stops.map(s => resolveStopCoords({ country: s.country, city: s.city })));
    const km = await computeTripKm(t.mode, resolvedStops);
    const { data, error } = await supabase.from("trips").update({ stops: resolvedStops, km }).eq("id", t.id).select().single();
    if (!error && data) setTrips(prev => prev.map(x => (x.id === t.id ? data : x)));
    setRecalcId(null);
  }

  async function removeTrip(id) {
    setTrips(prev => prev.filter(t => t.id !== id));
    await supabase.from("trips").delete().eq("id", id);
  }

  const stats = useMemo(() => {
    const countrySet = new Set();
    const citySet = new Set();
    const kmByMode = { avion: 0, coche: 0, tren: 0, barco: 0 };
    trips.forEach(t => {
      t.stops.forEach(s => {
        countrySet.add(s.country);
        citySet.add(`${s.city}, ${s.country}`);
      });
      const km = tripKm(t);
      if (km != null) kmByMode[t.mode] += km;
    });
    const kmTotal = Object.values(kmByMode).reduce((a, b) => a + b, 0);
    const contCounts = Object.fromEntries(CONTINENTS.map(c => [c.code, new Set()]));
    countrySet.forEach(name => {
      const c = COUNTRY_MAP[name];
      if (c) contCounts[c.cont].add(name);
    });
    const contsVisited = CONTINENTS.filter(c => contCounts[c.code].size > 0).length;
    return {
      countries: countrySet, cities: citySet, kmByMode, kmTotal, contCounts,
      contsVisited, pctWorld: (countrySet.size / TOTAL_COUNTRIES) * 100,
    };
  }, [trips]);

  const gaugeStyle = { background: `conic-gradient(${brass} ${Math.min(stats.pctWorld, 100) * 3.6}deg, ${inkLine} 0deg)` };

  return (
    <div style={{ background: ink, minHeight: "100vh", fontFamily: "'Inter',sans-serif", color: paper }}>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 16px 64px" }}>
        {/* Header */}
        <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: `1px solid ${inkLine}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Globe2 size={18} color={brass} />
                <span className="mono" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: "0.1em", color: textDim }}>
                  REGISTRO DE RUTAS · KM · COBERTURA MUNDIAL
                </span>
              </div>
              <h1 style={{ fontFamily: "'Bitter',serif", fontSize: 32, fontWeight: 800, margin: 0 }}>Bitácora de viajes</h1>
              <div style={{ fontSize: 12, color: textDim, marginTop: 4 }}>{session.user.email}</div>
            </div>
            <button onClick={() => supabase.auth.signOut()}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${inkLine}`, color: textDim, borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 12 }}>
              <LogOut size={14} /> Salir
            </button>
          </div>
        </div>

        {/* Formulario */}
        <div style={{ background: inkPanel, border: `1px solid ${inkLine}`, borderRadius: 8, padding: 18, marginBottom: 24 }}>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: "0.1em", color: brass, marginBottom: 16 }}>NUEVA RUTA</div>
          <div style={{ marginBottom: 16 }}>
            {stops.map((s, i) => {
              const isFirst = i === 0, isLast = i === stops.length - 1;
              const label = isFirst ? "ORIGEN" : isLast ? "DESTINO FINAL" : `PARADA ${i}`;
              return (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 10, color: isFirst || isLast ? brass : textDim, fontFamily: "'IBM Plex Mono',monospace" }}>{label}</label>
                      <select value={s.country} onChange={e => updateStop(i, "country", e.target.value)}
                        style={{ width: "100%", marginTop: 4, background: ink, border: `1px solid ${inkLine}`, color: paper, borderRadius: 6, padding: 8 }}>
                        {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div style={{ position: "relative" }}>
                      <label style={{ fontSize: 10, color: "transparent" }}>ciudad</label>
                      <input value={s.city} onChange={e => updateStop(i, "city", e.target.value)}
                        onFocus={() => { if (suggestions[i]?.length) setOpenSuggestIndex(i); }}
                        onBlur={() => setTimeout(() => setOpenSuggestIndex(null), 150)}
                        placeholder={isFirst ? "Ciudad de salida" : isLast ? "Ciudad de llegada" : "Ciudad de la parada"}
                        style={{ width: "100%", marginTop: 4, background: ink, border: `1px solid ${s.lat != null ? teal : inkLine}`, color: paper, borderRadius: 6, padding: 8 }} />
                      {openSuggestIndex === i && suggestions[i]?.length > 0 && (
                        <div style={{ position: "absolute", zIndex: 10, top: "100%", left: 0, right: 0, marginTop: 2, background: inkPanel, border: `1px solid ${inkLine}`, borderRadius: 6, maxHeight: 220, overflowY: "auto" }}>
                          {suggestions[i].map((sug, si) => (
                            <button key={si} type="button" onMouseDown={() => selectSuggestion(i, sug)}
                              style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", background: "none", border: "none", color: paper, cursor: "pointer", fontSize: 13, borderBottom: si < suggestions[i].length - 1 ? `1px solid ${inkLine}` : "none" }}>
                              {sug.name}
                              <span style={{ color: textDim, fontSize: 11 }}>{sug.admin1 ? `, ${sug.admin1}` : ""}, {sug.country}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {!isFirst && !isLast && (
                    <button onClick={() => removeStop(i)} style={{ marginTop: 24, padding: 8, background: "none", border: "none", color: rust, cursor: "pointer" }}>
                      <X size={16} />
                    </button>
                  )}
                </div>
              );
            })}
            {mode !== "avion" && (
              <button onClick={addStop} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, padding: "6px 12px", borderRadius: 6, border: `1px dashed ${inkLine}`, color: textDim, background: "none", cursor: "pointer" }}>
                <Plus size={13} /> Añadir parada
              </button>
            )}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {MODES.map(m => (
                <button key={m.id} onClick={() => selectMode(m.id)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 6, fontSize: 12, fontFamily: "'IBM Plex Mono',monospace", cursor: "pointer",
                    background: mode === m.id ? brass : "transparent", color: mode === m.id ? ink : textDim, border: `1px solid ${mode === m.id ? brass : inkLine}` }}>
                  <m.Icon size={14} /> {m.label}
                </button>
              ))}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: `1px solid ${inkLine}`, borderRadius: 6, fontSize: 12, color: textDim, cursor: "pointer", fontFamily: "'IBM Plex Mono',monospace" }}>
              <input type="checkbox" checked={roundTrip} onChange={e => setRoundTrip(e.target.checked)} />
              Ida y vuelta (×2 km)
            </label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ marginLeft: "auto", background: ink, border: `1px solid ${inkLine}`, color: textDim, borderRadius: 6, padding: 8, fontSize: 12, fontFamily: "'IBM Plex Mono',monospace" }} />
          </div>

          <button onClick={addTrip} disabled={saving} style={{ padding: "11px 20px", background: brass, color: ink, border: "none", borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Calculando distancia real..." : "Registrar viaje"}
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
          <StatBox label="PAÍSES" value={stats.countries.size} suffix={`/${TOTAL_COUNTRIES}`} sub={`${stats.pctWorld.toFixed(1)}% del mundo`} />
          <StatBox label="CONTINENTES" value={stats.contsVisited} suffix="/6" sub={`${((stats.contsVisited / 6) * 100).toFixed(0)}% explorado`} />
          <StatBox label="CIUDADES" value={stats.cities.size} sub="distintas visitadas" subDim />
        </div>

        {/* Km por medio */}
        <div style={{ background: inkPanel, border: `1px solid ${inkLine}`, borderRadius: 8, padding: 18, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: "0.1em", color: brass }}>KM POR MEDIO DE TRANSPORTE</span>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: textDim }}>
              TOTAL <span style={{ fontFamily: "'Bitter',serif", fontSize: 16, fontWeight: 700, color: paper }}>{stats.kmTotal.toLocaleString("es-ES")}</span> km
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
            {MODES.map(m => (
              <div key={m.id} style={{ background: ink, border: `1px solid ${inkLine}`, borderRadius: 6, padding: 10, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ background: inkPanel, borderRadius: 999, padding: 6, display: "flex" }}><m.Icon size={14} color={brass} /></div>
                <div>
                  <div style={{ fontSize: 9, color: textDim, fontFamily: "'IBM Plex Mono',monospace" }}>{m.label.toUpperCase()}</div>
                  <div style={{ fontFamily: "'Bitter',serif", fontSize: 16, fontWeight: 700 }}>
                    {stats.kmByMode[m.id].toLocaleString("es-ES")} <span style={{ fontSize: 10, fontWeight: 400, color: textDim }}>km</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Insignias */}
        <div style={{ background: inkPanel, border: `1px solid ${inkLine}`, borderRadius: 8, padding: 18, marginBottom: 24 }}>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: "0.1em", color: brass, marginBottom: 12 }}>INSIGNIAS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
            {BADGES.map(b => {
              const value = b.type === "km" ? stats.kmTotal : stats.cities.size;
              const unlocked = value >= b.threshold;
              const pct = Math.min((value / b.threshold) * 100, 100);
              return (
                <div key={b.id} style={{ background: ink, borderRadius: 6, padding: 10, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, border: `1px solid ${unlocked ? brass : inkLine}`, opacity: unlocked ? 1 : 0.6 }}>
                  {unlocked ? <Trophy size={20} color={brass} /> : <Lock size={16} color={textDim} />}
                  <div style={{ fontFamily: "'Bitter',serif", fontSize: 12, fontWeight: 700 }}>{b.title}</div>
                  <div style={{ fontSize: 9, color: textDim, fontFamily: "'IBM Plex Mono',monospace" }}>{b.desc}</div>
                  <div style={{ height: 4, width: "100%", background: inkLine, borderRadius: 2, overflow: "hidden", marginTop: 4 }}>
                    <div style={{ height: 4, width: `${pct}%`, background: unlocked ? brass : teal }} />
                  </div>
                  <div style={{ fontSize: 9, color: textDim, fontFamily: "'IBM Plex Mono',monospace" }}>
                    {value.toLocaleString("es-ES")}/{b.threshold.toLocaleString("es-ES")}{b.type === "km" ? " km" : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gauge + continentes */}
        <div style={{ background: inkPanel, border: `1px solid ${inkLine}`, borderRadius: 8, padding: 18, marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ width: 110, height: 110, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, ...gaugeStyle }}>
              <div style={{ width: 84, height: 84, borderRadius: 999, background: inkPanel, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontFamily: "'Bitter',serif", fontSize: 20, fontWeight: 700 }}>{stats.pctWorld.toFixed(1)}%</div>
                <div style={{ fontSize: 9, color: textDim, fontFamily: "'IBM Plex Mono',monospace" }}>MUNDO</div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              {CONTINENTS.map(c => {
                const visited = stats.contCounts[c.code]?.size || 0;
                const total = CONT_TOTALS[c.code];
                const pct = (visited / total) * 100;
                return (
                  <div key={c.code} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: textDim, fontFamily: "'IBM Plex Mono',monospace", marginBottom: 4 }}>
                      <span>{c.label}</span><span>{visited}/{total} · {pct.toFixed(0)}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: inkLine, overflow: "hidden" }}>
                      <div style={{ height: 6, width: `${pct}%`, background: visited > 0 ? teal : inkLine }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mapa mundial */}
        <div style={{ background: inkPanel, border: `1px solid ${inkLine}`, borderRadius: 8, padding: 18, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: "0.1em", color: brass }}>MAPA MUNDIAL</span>
            <span style={{ fontSize: 10, color: textDim, fontFamily: "'IBM Plex Mono',monospace" }}>rueda / pellizco para ampliar</span>
          </div>
          <div style={{ borderRadius: 6, overflow: "hidden" }}>
            <Plot
              data={[{
                type: "choropleth", locationmode: "ISO-3",
                locations: COUNTRIES.map(c => c.iso3),
                z: COUNTRIES.map(c => (stats.countries.has(c.name) ? 1 : 0)),
                text: COUNTRIES.map(c => c.name),
                hoverinfo: "text", showscale: false,
                colorscale: [[0, inkLine], [1, brass]],
                marker: { line: { color: ink, width: 0.5 } },
              }]}
              layout={{
                geo: { projection: { type: "natural earth" }, showframe: false, showcoastlines: false, showocean: true, oceancolor: ink, landcolor: inkLine, bgcolor: "transparent" },
                paper_bgcolor: "transparent", plot_bgcolor: "transparent",
                margin: { t: 10, b: 10, l: 0, r: 0 }, height: 420,
                font: { color: paper, family: "IBM Plex Mono, monospace", size: 10 },
              }}
              config={{ scrollZoom: true, displayModeBar: true, displaylogo: false, responsive: true }}
              useResizeHandler
              style={{ width: "100%", height: "420px" }}
            />
          </div>
        </div>

        {/* Banderas */}
        <div style={{ background: inkPanel, border: `1px solid ${inkLine}`, borderRadius: 8, padding: 18, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: "0.1em", color: brass }}>PAÍSES DEL MUNDO</span>
            <span style={{ fontSize: 10, color: textDim, fontFamily: "'IBM Plex Mono',monospace" }}>en color = visitado</span>
          </div>
          {CONTINENTS.map(c => (
            <div key={c.code} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: textDim, fontFamily: "'IBM Plex Mono',monospace", margin: "0 0 8px" }}>
                {c.label.toUpperCase()} · {stats.contCounts[c.code]?.size || 0}/{CONT_TOTALS[c.code]}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                {COUNTRIES.filter(x => x.cont === c.code).map(x => {
                  const visited = stats.countries.has(x.name);
                  return (
                    <div key={x.name} title={x.name} style={{ background: ink, borderRadius: 6, padding: 6, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      <img src={flagUrl(x.iso)} alt={x.name} loading="lazy"
                        style={{ width: 32, height: 22, objectFit: "cover", borderRadius: 2, filter: visited ? "none" : "grayscale(1)", opacity: visited ? 1 : 0.4 }} />
                      <span style={{ fontSize: 8, textAlign: "center", lineHeight: 1.1, fontFamily: "'IBM Plex Mono',monospace", color: visited ? paper : textDim }}>{x.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Listado */}
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: "0.1em", color: brass, marginBottom: 12 }}>
            RUTAS REGISTRADAS ({trips.length})
          </div>
          {loading ? (
            <div style={{ border: `1px dashed ${inkLine}`, borderRadius: 8, padding: 24, textAlign: "center", color: textDim, fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>Cargando...</div>
          ) : trips.length === 0 ? (
            <div style={{ border: `1px dashed ${inkLine}`, borderRadius: 8, padding: 24, textAlign: "center", color: textDim, fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>
              Aún no hay rutas. Añade tu primer viaje arriba.
            </div>
          ) : (
            <div>
              {trips.map(t => {
                const M = MODES.find(m => m.id === t.mode);
                const km = tripKm(t);
                return (
                  <div key={t.id} style={{ background: inkPanel, border: `1px solid ${inkLine}`, borderRadius: 8, padding: 12, display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <div style={{ background: ink, borderRadius: 999, padding: 8, display: "flex", flexShrink: 0 }}><M.Icon size={15} color={brass} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                        <MapPin size={11} color={textDim} />
                        {t.stops.map((s, i) => (
                          <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {i > 0 && <span style={{ color: brass }}>→</span>}
                            <span>{s.city}, {s.country}</span>
                          </span>
                        ))}
                        {t.round_trip && (
                          <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, border: `1px solid ${teal}`, color: teal, fontFamily: "'IBM Plex Mono',monospace" }}>IDA Y VUELTA</span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: textDim, fontFamily: "'IBM Plex Mono',monospace", marginTop: 2 }}>
                        {t.trip_date || "sin fecha"}{km != null ? ` · ${km.toLocaleString("es-ES")} km` : ""}
                        <button onClick={() => recalcTrip(t)} disabled={recalcId === t.id}
                          style={{ marginLeft: 8, background: "none", border: "none", color: brass, cursor: "pointer", fontSize: 10, fontFamily: "'IBM Plex Mono',monospace", textDecoration: "underline", padding: 0 }}>
                          {recalcId === t.id ? "recalculando..." : "⟳ recalcular"}
                        </button>
                      </div>
                    </div>
                    <button onClick={() => removeTrip(t.id)} style={{ padding: 6, background: "none", border: "none", color: rust, cursor: "pointer", flexShrink: 0 }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, suffix, sub, subDim }) {
  return (
    <div style={{ background: inkPanel, border: `1px solid ${inkLine}`, borderRadius: 8, padding: 14 }}>
      <div style={{ fontSize: 10, color: textDim, fontFamily: "'IBM Plex Mono',monospace" }}>{label}</div>
      <div style={{ fontFamily: "'Bitter',serif", fontSize: 22, fontWeight: 700, marginTop: 4 }}>
        {value}{suffix && <span style={{ fontSize: 13, color: textDim, fontWeight: 400 }}>{suffix}</span>}
      </div>
      <div style={{ fontSize: 10, color: subDim ? textDim : brass, fontFamily: "'IBM Plex Mono',monospace", marginTop: 2 }}>{sub}</div>
    </div>
  );
}
