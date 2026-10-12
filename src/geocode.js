import { MAPTILER_KEY } from './mapKey';

/**
 * searchPlaces — forward geocoding for the map search box.
 *
 * Tries the MapTiler Geocoding API first (same key as the tiles, CORS-enabled),
 * then falls back to OpenStreetMap Nominatim so search still works if the
 * MapTiler key is missing or rate-limited.
 *
 * Resolves to a normalised list:
 *   [{ id, name, lat, lng }]
 */
export async function searchPlaces(query, signal) {
  const q = String(query || '').trim();
  if (q.length < 3) return [];

  // ---------------------------------------------------------------- MapTiler
  try {
    const url =
      `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json` +
      `?key=${MAPTILER_KEY}&limit=6&language=en&autocomplete=true`;
    const res = await fetch(url, { signal });
    if (res.ok) {
      const data = await res.json();
      const features = Array.isArray(data.features) ? data.features : [];
      if (features.length > 0) {
        return features
          .filter((f) => Array.isArray(f.center) && f.center.length === 2)
          .map((f) => ({
            id: f.id || `${f.center[1]},${f.center[0]}`,
            name: f.place_name || f.text || q,
            lat: f.center[1],
            lng: f.center[0],
          }));
      }
    }
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    // fall through to Nominatim
  }

  // --------------------------------------------------------------- Nominatim
  try {
    const url =
      'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=' +
      encodeURIComponent(q);
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      return (Array.isArray(data) ? data : []).map((d) => ({
        id: `osm-${d.osm_type}-${d.osm_id}`,
        name: d.display_name || q,
        lat: Number(d.lat),
        lng: Number(d.lon),
      }));
    }
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
  }

  return [];
}
