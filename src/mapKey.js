// Single source of truth for the MapTiler key.
// Prefer VITE_MAPTILER_KEY (see Frontend/.env.example); the literal is a
// fallback so the app runs out of the box. Restrict the key by domain at
// https://cloud.maptiler.com/account/keys/
export const MAPTILER_KEY =
  import.meta.env.VITE_MAPTILER_KEY || 'PAAtuckOiCsaL8MuwMIX';
