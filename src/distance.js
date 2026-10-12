import { getDistance } from 'geolib';

/**
 * distance — shared geolib helpers so the map and the action menus always
 * report the same numbers.
 */

/** Metres between two {lat,lng} points. Returns null if either is missing. */
export function distanceMeters(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  return getDistance(
    { latitude: a.lat, longitude: a.lng },
    { latitude: b.lat, longitude: b.lng }
  );
}

/** Human-friendly distance label: "240 m" or "1.4 km". */
export function formatDistance(meters) {
  if (meters == null) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}
