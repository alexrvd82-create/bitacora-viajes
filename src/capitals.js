import { COUNTRY_MAP, haversineKm } from "./data.js";

/* Una capital cuenta como visitada si alguna parada del viaje está a menos de este radio
   de las coordenadas de la capital del país (data.js guarda las coordenadas de cada capital). */
const CAPITAL_RADIUS_KM = 30;

export function visitedCapitals(trips, { skipOrigin = false } = {}) {
  const set = new Set();
  (trips || []).forEach(t => (t.stops || []).forEach((s, i) => {
    if (skipOrigin && i === 0) return;
    // Sin coordenadas, o con las de la capital puestas como aproximación porque no se halló la ciudad: no cuenta
    if (s.lat == null || s.lon == null || s.approx) return;
    const c = COUNTRY_MAP[s.country];
    if (!c) return;
    if (haversineKm({ lat: s.lat, lon: s.lon }, c) <= CAPITAL_RADIUS_KM) set.add(c.name);
  }));
  return set;
}
