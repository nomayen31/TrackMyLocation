/**
 * routing — road-wise (turn-by-turn geometry) routing for the map.
 *
 * Uses the OSRM demo server, which returns real road geometry as GeoJSON:
 *   https://router.project-osrm.org/route/v1/{profile}/{lng},{lat};{lng},{lat}
 *
 * Note: the public OSRM demo box only really runs the car profile, so for
 * walking/cycling we reuse the road geometry but derive the ETA from that
 * mode's typical speed (flagged as `approx`). For production, point
 * `OSRM_BASE` at a self-hosted OSRM, or swap in MapTiler/Mapbox Directions.
 */

const OSRM_BASE = 'https://router.project-osrm.org';

export const ROUTE_MODES = [
  { id: 'driving', label: 'Drive', osrm: 'driving', speedKmh: null },
  { id: 'walking', label: 'Walk', osrm: 'foot', speedKmh: 4.8 },
  { id: 'cycling', label: 'Cycle', osrm: 'bike', speedKmh: 15 },
];

/** Seconds/km/h → metres/second. */
const kmhToMs = (kmh) => (kmh * 1000) / 3600;

/**
 * Fetch the road route between two {lat,lng} points.
 * Resolves to `{ coordinates: [[lat,lng], …], distanceMeters, durationSeconds, mode, approx }`,
 * or `null` when a route cannot be found.
 */
export async function getRoute(from, to, modeId = 'driving', signal) {
  const mode = ROUTE_MODES.find((m) => m.id === modeId) || ROUTE_MODES[0];
  if (!from || !to) return null;

  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `${OSRM_BASE}/route/v1/${mode.osrm}/${coords}?overview=full&geometries=geojson&steps=false`;

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;

    const data = await res.json();
    const route = data?.routes?.[0];
    const raw = route?.geometry?.coordinates;
    if (!Array.isArray(raw) || raw.length === 0) return null;

    // GeoJSON gives [lng,lat] — Leaflet wants [lat,lng].
    const coordinates = raw.map(([lng, lat]) => [lat, lng]);
    const distanceMeters = Number(route.distance) || 0;
    const approx = Boolean(mode.speedKmh);
    const durationSeconds = approx
      ? distanceMeters / kmhToMs(mode.speedKmh)
      : Number(route.duration) || 0;

    return { coordinates, distanceMeters, durationSeconds, mode: mode.id, approx };
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    return null;
  }
}

/** "6 min" / "1 h 5 min". */
export function formatDuration(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return '';
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}
