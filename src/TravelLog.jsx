import { useState, useEffect, useMemo, useRef, lazy, Suspense, Component } from "react";
import { Plane, PlaneTakeoff, Car, TrainFront, Ship, Trash2, MapPin, Globe2, Plus, X, Trophy, Lock, LogOut, Sun, Moon, Coffee, ChevronDown, Building2, Flag, Route, Pencil } from "lucide-react";
import { supabase } from "./supabaseClient";
import ShareCard from "./ShareCard.jsx";
import { useLanguage } from "./i18n/LanguageContext.jsx";
import LanguageSwitcher from "./i18n/LanguageSwitcher.jsx";
import {
  COUNTRIES, COUNTRY_MAP, CONTINENTS, CONT_TOTALS, TOTAL_COUNTRIES,
  flagUrl, tripKm, resolveStopCoords, computeTripKm, searchCities,
} from "./data.js";

const Plot = lazy(() => import("react-plotly.js"));

// Aísla el mapa mundial (Plotly) del resto de la app: si falla al cargar o
// renderizar en un dispositivo con pocos recursos, no rompe el resto de la página.
class MapErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error) { console.error("World map failed to render:", error); }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

const THEMES = {
  dark: { ink: "#0a0f1e", inkPanel: "#141b30", inkLine: "#2a3654", paper: "#efe6d2", brass: "#e8b23d", teal: "#4fd1c5", rust: "#e5484d", textDim: "#f2f0e8" },
  light: { ink: "#f6efe0", inkPanel: "#ecdfc0", inkLine: "#c9b280", paper: "#161108", brass: "#6b3f10", teal: "#0d6e63", rust: "#a52a2a", textDim: "#161108" },
};

const emptyStops = () => [{ country: "España", city: "" }, { country: "Francia", city: "" }];

const CONTINENT_KEY = { EU: "europe", AS: "asia", AF: "africa", NA: "northAmerica", SA: "southAmerica", OC: "oceania" };

const TIERS = ["#c07830", "#b7bec9", "#e8b23d", "#4fd1c5"]; // bronze, silver, gold, diamond

// Badge "families": each defines how to compute value, the icon, and the thresholds (tiers).
const BADGE_FAMILIES = [
  { id: "cities", icon: Building2, statKey: "citiesCount", thresholds: [10, 25, 50, 100], unit: "", titleKey: "cities", descKey: "badgeDescCities" },
  { id: "countries", icon: Flag, statKey: "countriesCount", thresholds: [10, 25, 50, 100], unit: "", titleKey: "countries", descKey: "badgeDescCountries" },
  { id: "continents", icon: Globe2, statKey: "contsVisited", thresholds: [3, 6], unit: "/6", titleKey: "continents", descKey: "badgeDescContinents" },
  { id: "kmTotal", icon: Route, statKey: "kmTotal", thresholds: [10000, 50000, 100000, 500000, 1000000], unit: "km", isKm: true, descKey: "badgeDescKmTotal" },
  { id: "kmPlane", icon: Plane, statKey: "kmPlane", thresholds: [10000, 50000, 100000], unit: "km", isKm: true, modeLabelKey: "modePlane", descKey: "badgeDescKmMode" },
  { id: "kmCar", icon: Car, statKey: "kmCar", thresholds: [10000, 50000], unit: "km", isKm: true, modeLabelKey: "modeCar", descKey: "badgeDescKmMode" },
  { id: "kmTrain", icon: TrainFront, statKey: "kmTrain", thresholds: [10000, 50000], unit: "km", isKm: true, modeLabelKey: "modeTrain", descKey: "badgeDescKmMode" },
  { id: "kmBoat", icon: Ship, statKey: "kmBoat", thresholds: [1000, 5000], unit: "km", isKm: true, modeLabelKey: "modeBoat", descKey: "badgeDescKmMode" },
  { id: "flights", icon: PlaneTakeoff, statKey: "flightsCount", thresholds: [5, 10, 25, 50], unit: "", labelKey: "badgeFlightsLabel", descKey: "badgeDescFlights" },
  { id: "trips", icon: Trophy, statKey: "tripsCount", thresholds: [10, 25, 50, 100], unit: "", labelKey: "badgeTripsLabel", descKey: "badgeDescTrips" },
];

export default function TravelLog({ session }) {
  const { t, locale } = useLanguage();
  const MODES = [
    { id: "avion", label: t("modePlane"), Icon: Plane },
    { id: "coche", label: t("modeCar"), Icon: Car },
    { id: "tren", label: t("modeTrain"), Icon: TrainFront },
    { id: "barco", label: t("modeBoat"), Icon: Ship },
  ];
  const [dark, setDark] = useState(() => localStorage.getItem("bitacora-theme") !== "light");
  useEffect(() => { localStorage.setItem("bitacora-theme", dark ? "dark" : "light"); }, [dark]);
  const { ink, inkPanel, inkLine, paper, brass, teal, rust, textDim } = THEMES[dark ? "dark" : "light"];
  const [expandedConts, setExpandedConts] = useState({});
  function toggleCont(code) { setExpandedConts(p => ({ ...p, [code]: !p[code] })); }
  const [expandedRouteConts, setExpandedRouteConts] = useState({});
  function toggleRouteCont(code) { setExpandedRouteConts(p => ({ ...p, [code]: !p[code] })); }

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stops, setStops] = useState(emptyStops());
  const [mode, setMode] = useState("avion");
  const [date, setDate] = useState("");
  const [roundTrip, setRoundTrip] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState({}); // { [stopIndex]: [{name, admin1, country, country_code, lat, lon}] }
  const [openSuggestIndex, setOpenSuggestIndex] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const debounceRef = useRef({});
  const [unit, setUnit] = useState(() => localStorage.getItem("bitacora-unit") || "km");
  useEffect(() => { localStorage.setItem("bitacora-unit", unit); }, [unit]);
  function formatDist(km) {
    if (km == null) return "";
    const value = unit === "mi" ? km * 0.621371 : km;
    return `${Math.round(value).toLocaleString(locale)} ${unit}`;
  }

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
      notes: notes.trim() || null,
    };
    if (editingId) {
      const { data, error } = await supabase.from("trips").update(payload).eq("id", editingId).select().single();
      if (!error && data) setTrips(prev => prev.map(t => (t.id === editingId ? data : t)));
      setEditingId(null);
    } else {
      const { data, error } = await supabase.from("trips").insert(payload).select().single();
      if (!error && data) setTrips(prev => [data, ...prev]);
    }
    setStops(prev => (prev.length > 2 ? emptyStops() : prev.map(s => ({ ...s, city: "", lat: undefined, lon: undefined }))));
    setDate("");
    setNotes("");
    setSaving(false);
  }

  function startEdit(trip) {
    setEditingId(trip.id);
    setStops(trip.stops.map(s => ({ ...s })));
    setMode(trip.mode);
    setDate(trip.trip_date || "");
    setRoundTrip(!!trip.round_trip);
    setNotes(trip.notes || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setStops(emptyStops());
    setMode("avion");
    setDate("");
    setRoundTrip(true);
    setNotes("");
  }

  async function removeTrip(id) {
    setTrips(prev => prev.filter(t => t.id !== id));
    await supabase.from("trips").delete().eq("id", id);
  }

  async function deleteAllData() {
    const confirmed = window.confirm(t("deleteDataConfirm"));
    if (!confirmed) return;
    await supabase.from("trips").delete().eq("user_id", session.user.id);
    setTrips([]);
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
    const flightsCount = trips.filter(t => t.mode === "avion").length;
    return {
      countries: countrySet, cities: citySet, kmByMode, kmTotal, contCounts, flightsCount,
      contsVisited, pctWorld: (countrySet.size / TOTAL_COUNTRIES) * 100,
      citiesCount: citySet.size, countriesCount: countrySet.size, tripsCount: trips.length,
      kmPlane: kmByMode.avion, kmCar: kmByMode.coche, kmTrain: kmByMode.tren, kmBoat: kmByMode.barco,
    };
  }, [trips]);

  const gaugeStyle = { background: `conic-gradient(${brass} ${Math.min(stats.pctWorld, 100) * 3.6}deg, ${inkLine} 0deg)` };

  return (
    <div style={{ background: ink, minHeight: "100vh", fontFamily: "'Inter',sans-serif", color: paper }}>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 16px 64px" }}>
        {/* Header */}
        <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: `1px solid ${inkLine}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <img src="/logo-v4.png" alt="" style={{ width: 56, height: 56, objectFit: "contain" }} />
                <span className="mono" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: "0.1em", color: textDim }}>
                  {t("tagline")}
                </span>
              </div>
              <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 32, fontWeight: 800, margin: 0 }}>{t("appName")}</h1>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <LanguageSwitcher theme={{ ink, inkPanel, inkLine, textDim }} compact />
                <button onClick={() => setUnit(u => u === "km" ? "mi" : "km")} aria-label="Toggle unit"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: `1px solid ${inkLine}`, color: textDim, borderRadius: 14, height: 36, minWidth: 36, padding: "0 10px", cursor: "pointer", fontSize: 11, fontFamily: "'IBM Plex Mono',monospace", fontWeight: 700 }}>
                  {unit.toUpperCase()}
                </button>
                <button onClick={() => setDark(d => !d)} aria-label={t("changeTheme")}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: `1px solid ${inkLine}`, color: textDim, borderRadius: 14, width: 36, height: 36, cursor: "pointer" }}>
                  {dark ? <Sun size={15} /> : <Moon size={15} />}
                </button>
                <button onClick={() => supabase.auth.signOut()}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${inkLine}`, color: textDim, borderRadius: 14, padding: "8px 12px", cursor: "pointer", fontSize: 12 }}>
                  <LogOut size={14} /> {t("logout")}
                </button>
              </div>
              <div style={{ fontSize: 12, color: textDim }}>{session.user.email}</div>
              <button onClick={deleteAllData}
                style={{ background: "none", border: "none", color: textDim, opacity: 0.6, fontSize: 10, textDecoration: "underline", cursor: "pointer", padding: 0 }}>
                {t("deleteDataLink")}
              </button>
              <a href="https://paypal.me/proyectovb6" target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: ink, background: brass, padding: "7px 14px", borderRadius: 999, textDecoration: "none", fontFamily: "'IBM Plex Mono',monospace" }}>
                <Coffee size={14} /> {t("invite_coffee")}
              </a>
            </div>
          </div>
        </div>

        {!loading && trips.length === 0 && (
          <div style={{ background: `linear-gradient(135deg, ${inkPanel}, ${ink})`, border: `1px solid ${brass}55`, borderRadius: 14, padding: 20, marginBottom: 20, textAlign: "center" }}>
            <Globe2 size={26} color={brass} style={{ marginBottom: 8 }} />
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{t("welcomeTitle")}</div>
            <div style={{ fontSize: 13, color: textDim, maxWidth: 440, margin: "0 auto" }}>{t("welcomeDesc")}</div>
          </div>
        )}

        {/* Formulario */}
        <div style={{ background: inkPanel, border: `1px solid ${inkLine}`, borderRadius: 14, padding: 18, marginBottom: 24 }}>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: "0.1em", color: brass, marginBottom: 16 }}>{editingId ? t("editRoute") : t("newRoute")}</div>
          <div style={{ marginBottom: 16 }}>
            {stops.map((s, i) => {
              const isFirst = i === 0, isLast = i === stops.length - 1;
              const label = isFirst ? t("origin") : isLast ? t("finalDestination") : `${t("stop")} ${i}`;
              return (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 10, color: isFirst || isLast ? brass : textDim, fontFamily: "'IBM Plex Mono',monospace" }}>{label}</label>
                      <select value={s.country} onChange={e => updateStop(i, "country", e.target.value)}
                        style={{ width: "100%", marginTop: 4, background: ink, border: `1px solid ${inkLine}`, color: paper, borderRadius: 10, padding: 8 }}>
                        {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div style={{ position: "relative" }}>
                      <label style={{ fontSize: 10, color: "transparent" }}>city</label>
                      <input value={s.city} onChange={e => updateStop(i, "city", e.target.value)}
                        onFocus={() => { if (suggestions[i]?.length) setOpenSuggestIndex(i); }}
                        onBlur={() => setTimeout(() => setOpenSuggestIndex(null), 150)}
                        placeholder={isFirst ? t("departureCity") : isLast ? t("arrivalCity") : t("stopCity")}
                        style={{ width: "100%", marginTop: 4, background: ink, border: `1px solid ${s.lat != null ? teal : inkLine}`, color: paper, borderRadius: 10, padding: 8 }} />
                      {openSuggestIndex === i && suggestions[i]?.length > 0 && (
                        <div style={{ position: "absolute", zIndex: 10, top: "100%", left: 0, right: 0, marginTop: 2, background: inkPanel, border: `1px solid ${inkLine}`, borderRadius: 10, maxHeight: 220, overflowY: "auto" }}>
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
              <button onClick={addStop} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, padding: "6px 12px", borderRadius: 10, border: `1px dashed ${inkLine}`, color: textDim, background: "none", cursor: "pointer" }}>
                <Plus size={13} /> {t("addStop")}
              </button>
            )}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div className="mode-btns">
              {MODES.map(m => (
                <button key={m.id} onClick={() => selectMode(m.id)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, fontSize: 12, fontFamily: "'IBM Plex Mono',monospace", cursor: "pointer",
                    background: mode === m.id ? brass : "transparent", color: mode === m.id ? ink : textDim, border: `1px solid ${mode === m.id ? brass : inkLine}` }}>
                  <m.Icon size={14} /> {m.label}
                </button>
              ))}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: `1px solid ${inkLine}`, borderRadius: 10, fontSize: 12, color: textDim, cursor: "pointer", fontFamily: "'IBM Plex Mono',monospace" }}>
              <input type="checkbox" checked={roundTrip} onChange={e => setRoundTrip(e.target.checked)} />
              {t("roundTrip")}
            </label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ marginLeft: "auto", background: ink, border: `1px solid ${inkLine}`, color: textDim, borderRadius: 10, padding: 8, fontSize: 12, fontFamily: "'IBM Plex Mono',monospace" }} />
          </div>

          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t("notesPlaceholder")} rows={2} maxLength={500}
            style={{ width: "100%", background: ink, border: `1px solid ${inkLine}`, color: paper, borderRadius: 10, padding: 8, fontSize: 13, fontFamily: "inherit", resize: "vertical", marginBottom: 16 }} />

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={addTrip} disabled={saving} style={{ padding: "11px 20px", background: brass, color: ink, border: "none", borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? t("calculatingDistance") : editingId ? t("saveChanges") : t("registerTrip")}
            </button>
            {editingId && (
              <button onClick={cancelEdit} style={{ padding: "11px 20px", background: "none", color: textDim, border: `1px solid ${inkLine}`, borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                {t("cancelEdit")}
              </button>
            )}
          </div>
        </div>

        {/* Compartir resumen */}
        <ShareCard trips={trips} theme={{ ink, inkPanel, inkLine, paper, brass, teal, textDim }} dark={dark} />

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
          <StatBox theme={{ inkPanel, inkLine, textDim, brass }} label={t("countries")} value={stats.countries.size} suffix={`/${TOTAL_COUNTRIES}`} sub={`${stats.pctWorld.toFixed(1)}% ${t("ofWorld")}`} />
          <StatBox theme={{ inkPanel, inkLine, textDim, brass }} label={t("continents")} value={stats.contsVisited} suffix="/6" sub={`${((stats.contsVisited / 6) * 100).toFixed(0)}% ${t("explored")}`} />
          <StatBox theme={{ inkPanel, inkLine, textDim, brass }} label={t("cities")} value={stats.cities.size} sub={t("distinctVisited")} subDim />
        </div>

        {/* Km por medio */}
        <div style={{ background: inkPanel, border: `1px solid ${inkLine}`, borderRadius: 14, padding: 18, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: "0.1em", color: brass }}>{t("kmByMode")}</span>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: textDim }}>
              {t("total")} <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 700, color: paper }}>{formatDist(stats.kmTotal)}</span>
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
            {MODES.map(m => (
              <div key={m.id} style={{ background: ink, border: `1px solid ${inkLine}`, borderRadius: 10, padding: 10, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ background: inkPanel, borderRadius: 999, padding: 6, display: "flex" }}><m.Icon size={14} color={brass} /></div>
                <div>
                  <div style={{ fontSize: 9, color: textDim, fontFamily: "'IBM Plex Mono',monospace" }}>{m.label.toUpperCase()}</div>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 700 }}>
                    {formatDist(stats.kmByMode[m.id])}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Insignias */}
        <div style={{ background: inkPanel, border: `1px solid ${inkLine}`, borderRadius: 14, padding: 18, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: "0.1em", color: brass }}>{t("badges")}</span>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: textDim }}>
              {(() => {
                const all = BADGE_FAMILIES.flatMap(f => f.thresholds);
                const unlockedCount = BADGE_FAMILIES.reduce((sum, f) => sum + f.thresholds.filter(th => stats[f.statKey] >= th).length, 0);
                return `${unlockedCount}/${all.length}`;
              })()}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-start" }}>
            {BADGE_FAMILIES.map(fam => fam.thresholds.map((threshold, tierIdx) => {
              const value = stats[fam.statKey] || 0;
              const unlocked = value >= threshold;
              const tierColor = TIERS[Math.min(tierIdx, TIERS.length - 1)];
              const Icon = fam.icon;
              const label = fam.isKm
                ? formatDist(threshold)
                : fam.titleKey
                  ? `${threshold} ${t(fam.titleKey).toLowerCase()}`
                  : `${threshold} ${t(fam.labelKey)}`;
              const sub = fam.modeLabelKey ? t(fam.modeLabelKey) : (fam.descKey ? t(fam.descKey) : "");
              return (
                <div key={`${fam.id}-${threshold}`} title={`${label}${sub ? " · " + sub : ""}`}
                  style={{ width: 64, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: unlocked ? 1 : 0.45 }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    background: unlocked ? `linear-gradient(145deg, ${tierColor}33, ${tierColor}11)` : ink,
                    border: `2px solid ${unlocked ? tierColor : inkLine}`,
                    boxShadow: unlocked ? `0 0 0 3px ${tierColor}22` : "none",
                  }}>
                    {unlocked ? <Icon size={19} color={tierColor} /> : <Lock size={14} color={textDim} />}
                  </div>
                  <div style={{ fontSize: 8, textAlign: "center", lineHeight: 1.15, fontFamily: "'IBM Plex Mono',monospace", color: unlocked ? paper : textDim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
                    {label}
                  </div>
                </div>
              );
            }))}
          </div>
        </div>

        {/* Gauge + continentes */}
        <div style={{ background: inkPanel, border: `1px solid ${inkLine}`, borderRadius: 14, padding: 18, marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ width: 110, height: 110, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, ...gaugeStyle }}>
              <div style={{ width: 84, height: 84, borderRadius: 999, background: inkPanel, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 700 }}>{stats.pctWorld.toFixed(1)}%</div>
                <div style={{ fontSize: 9, color: textDim, fontFamily: "'IBM Plex Mono',monospace" }}>{t("world")}</div>
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
                      <span>{t(CONTINENT_KEY[c.code] || c.label)}</span><span>{visited}/{total} · {pct.toFixed(0)}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: inkLine, overflow: "hidden" }}>
                      <div style={{ height: 6, width: `${pct}%`, background: visited > 0 ? brass : inkLine }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mapa mundial */}
        <div style={{ background: inkPanel, border: `1px solid ${inkLine}`, borderRadius: 14, padding: 18, marginBottom: 24 }}>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: "0.1em", color: brass }}>{t("worldMap")}</span>
          </div>
          <div style={{ borderRadius: 10, overflow: "hidden" }}>
            <MapErrorBoundary fallback={
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: textDim, fontSize: 12, fontFamily: "'IBM Plex Mono',monospace", textAlign: "center", padding: 20 }}>
                {t("mapLoadError")}
              </div>
            }>
              <Suspense fallback={<div style={{ height: 420, display: "flex", alignItems: "center", justifyContent: "center", color: textDim, fontSize: 12 }}>…</div>}>
                <Plot
                  data={[{
                    type: "choropleth", locationmode: "ISO-3",
                    locations: COUNTRIES.map(c => c.iso3),
                    z: COUNTRIES.map(c => (stats.countries.has(c.name) ? 1 : 0)),
                    text: COUNTRIES.map(c => c.name),
                    hoverinfo: "text", showscale: false,
                    colorscale: [[0, inkLine], [1, "#8a5c14"]],
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
              </Suspense>
            </MapErrorBoundary>
          </div>
        </div>

        {/* Banderas */}
        <div style={{ background: inkPanel, border: `1px solid ${inkLine}`, borderRadius: 14, padding: 18, marginBottom: 24 }}>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: "0.1em", color: brass }}>{t("worldCountries")}</span>
          </div>
          {CONTINENTS.map(c => {
            const contCountries = COUNTRIES.filter(x => x.cont === c.code);
            const visitedCount = stats.contCounts[c.code]?.size || 0;
            const total = CONT_TOTALS[c.code];
            const isOpen = !!expandedConts[c.code];
            const sorted = [...contCountries].sort((a, b) => {
              const va = stats.countries.has(a.name), vb = stats.countries.has(b.name);
              if (va !== vb) return va ? -1 : 1;
              return a.name.localeCompare(b.name);
            });
            const previewVisited = contCountries.filter(x => stats.countries.has(x.name)).slice(0, 6);
            return (
              <div key={c.code} style={{ marginBottom: 10, borderBottom: `1px solid ${inkLine}`, paddingBottom: 10 }}>
                <button onClick={() => toggleCont(c.code)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", padding: "4px 0", color: "inherit" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 11, color: textDim, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "0.05em" }}>
                      {t(CONTINENT_KEY[c.code] || c.label).toUpperCase()}
                    </span>
                    <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono',monospace", color: visitedCount > 0 ? brass : textDim, fontWeight: 700 }}>
                      {visitedCount}/{total}
                    </span>
                    {!isOpen && previewVisited.length > 0 && (
                      <div style={{ display: "flex", marginLeft: 2 }}>
                        {previewVisited.map((x, i) => (
                          <img key={x.name} src={flagUrl(x.iso)} alt="" loading="lazy"
                            style={{ width: 18, height: 13, objectFit: "cover", borderRadius: 2, marginLeft: i === 0 ? 0 : -6, border: `1.5px solid ${inkPanel}`, boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
                        ))}
                        {visitedCount > previewVisited.length && (
                          <span style={{ fontSize: 9, color: textDim, fontFamily: "'IBM Plex Mono',monospace", marginLeft: 6, alignSelf: "center" }}>
                            +{visitedCount - previewVisited.length}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 60, height: 4, background: inkLine, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: 4, width: `${(visitedCount / total) * 100}%`, background: brass, borderRadius: 2 }} />
                    </div>
                    <ChevronDown size={14} color={textDim} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }} />
                  </div>
                </button>
                {isOpen && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12, animation: "fadeIn 0.15s ease" }}>
                    {sorted.map(x => {
                      const visited = stats.countries.has(x.name);
                      return (
                        <div key={x.name} title={x.name} className="flag-chip"
                          style={{ background: ink, borderRadius: 8, padding: "5px 5px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, width: 52, cursor: "default", transition: "transform 0.15s ease" }}>
                          <img src={flagUrl(x.iso)} alt={x.name} loading="lazy"
                            style={{ width: 30, height: 20, objectFit: "cover", borderRadius: 3, filter: visited ? "none" : "grayscale(1)", opacity: visited ? 1 : 0.35 }} />
                          <span style={{ fontSize: 7, textAlign: "center", lineHeight: 1.1, fontFamily: "'IBM Plex Mono',monospace", color: visited ? paper : textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>{x.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Listado */}
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: "0.1em", color: brass, marginBottom: 12 }}>
            {t("registeredRoutes")} ({trips.length})
          </div>
          {loading ? (
            <div style={{ border: `1px dashed ${inkLine}`, borderRadius: 14, padding: 24, textAlign: "center", color: textDim, fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>{t("loadingTrips")}</div>
          ) : trips.length === 0 ? (
            <div style={{ border: `1px dashed ${inkLine}`, borderRadius: 14, padding: 24, textAlign: "center", color: textDim, fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>
              {t("noTripsYet")}
            </div>
          ) : (
            <div>
              {(() => {
                const groups = {};
                for (const trip of trips) {
                  const destCountry = COUNTRY_MAP[trip.stops[trip.stops.length - 1]?.country];
                  const code = destCountry?.cont || "OTHER";
                  (groups[code] = groups[code] || []).push(trip);
                }
                const orderedCodes = [...CONTINENTS.map(c => c.code), "OTHER"].filter(code => groups[code]?.length);
                return orderedCodes.map(code => {
                  const contTrips = groups[code];
                  const isOpen = !!expandedRouteConts[code];
                  const totalKm = contTrips.reduce((sum, trip) => sum + (tripKm(trip) || 0), 0);
                  const previewModes = [...new Set(contTrips.map(tr => tr.mode))].slice(0, 4).map(id => MODES.find(m => m.id === id)).filter(Boolean);
                  return (
                    <div key={code} style={{ marginBottom: 10, borderBottom: `1px solid ${inkLine}`, paddingBottom: 10 }}>
                      <button onClick={() => toggleRouteCont(code)}
                        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", padding: "4px 0", color: "inherit" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 11, color: textDim, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "0.05em" }}>
                            {code === "OTHER" ? t("world").toUpperCase() : t(CONTINENT_KEY[code] || code).toUpperCase()}
                          </span>
                          <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono',monospace", color: brass, fontWeight: 700 }}>
                            {contTrips.length}
                          </span>
                          {!isOpen && (
                            <div style={{ display: "flex", gap: 4, marginLeft: 2 }}>
                              {previewModes.map(m => (
                                <div key={m.id} style={{ background: ink, borderRadius: 999, padding: 5, display: "flex" }}><m.Icon size={11} color={brass} /></div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: textDim, fontFamily: "'IBM Plex Mono',monospace" }}>{formatDist(totalKm)}</span>
                          <ChevronDown size={14} color={textDim} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }} />
                        </div>
                      </button>
                      {isOpen && (
                        <div style={{ marginTop: 10, animation: "fadeIn 0.15s ease" }}>
                          {contTrips.map(trip => {
                            const M = MODES.find(m => m.id === trip.mode);
                            const km = tripKm(trip);
                            return (
                              <div key={trip.id} style={{ background: inkPanel, border: `1px solid ${inkLine}`, borderRadius: 14, padding: 12, display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                                <div style={{ background: ink, borderRadius: 999, padding: 8, display: "flex", flexShrink: 0 }}><M.Icon size={15} color={brass} /></div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 14, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                                    <MapPin size={11} color={textDim} />
                                    {trip.stops.map((s, i) => (
                                      <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        {i > 0 && <span style={{ color: brass }}>{trip.round_trip ? "↔" : "→"}</span>}
                                        <span>{s.city}, {s.country}</span>
                                      </span>
                                    ))}
                                  </div>
                                  <div style={{ fontSize: 10, color: textDim, fontFamily: "'IBM Plex Mono',monospace", marginTop: 2 }}>
                                    {trip.trip_date || t("noDate")}{km != null ? ` · ${formatDist(km)}` : ""}
                                  </div>
                                  {trip.notes && (
                                    <div style={{ fontSize: 12, color: paper, marginTop: 4, fontStyle: "italic" }}>{trip.notes}</div>
                                  )}
                                </div>
                                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                  <button onClick={() => startEdit(trip)} style={{ padding: 6, background: "none", border: "none", color: textDim, cursor: "pointer" }}>
                                    <Pencil size={14} />
                                  </button>
                                  <button onClick={() => removeTrip(trip.id)} style={{ padding: 6, background: "none", border: "none", color: rust, cursor: "pointer" }}>
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ theme, label, value, suffix, sub, subDim }) {
  const { inkPanel, inkLine, textDim, brass } = theme;
  return (
    <div style={{ background: inkPanel, border: `1px solid ${inkLine}`, borderRadius: 14, padding: 14 }}>
      <div style={{ fontSize: 10, color: textDim, fontFamily: "'IBM Plex Mono',monospace" }}>{label}</div>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, marginTop: 4 }}>
        {value}{suffix && <span style={{ fontSize: 13, color: textDim, fontWeight: 400 }}>{suffix}</span>}
      </div>
      <div style={{ fontSize: 10, color: subDim ? textDim : brass, fontFamily: "'IBM Plex Mono',monospace", marginTop: 2 }}>{sub}</div>
    </div>
  );
}
