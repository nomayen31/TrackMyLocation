/**
 * invite — read a group invite token from the URL and clean it up afterwards.
 *
 * Supported shapes (so the same link works whether the server rewrites it or
 * the SPA receives the raw path):
 *   /join/<token>
 *   /?invite=<token>
 *   /?join=<token>
 *   /#join=<token>
 */
export function readInviteToken() {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('invite') || params.get('join');
  if (fromQuery) return fromQuery;

  const fromPath = window.location.pathname.match(/\/join\/([A-Za-z0-9_-]{8,})/);
  if (fromPath) return fromPath[1];

  const fromHash = window.location.hash.match(/join[=/]([A-Za-z0-9_-]{8,})/);
  if (fromHash) return fromHash[1];

  return null;
}

/** Remove the invite token from the address bar without a navigation. */
export function clearInviteFromUrl() {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('invite');
    url.searchParams.delete('join');
    let path = url.pathname.replace(/\/join\/[A-Za-z0-9_-]+\/?$/, '/');
    if (!path) path = '/';
    const qs = url.searchParams.toString();
    const hash = url.hash && !/join[=/]/.test(url.hash) ? url.hash : '';
    window.history.replaceState({}, '', `${path}${qs ? `?${qs}` : ''}${hash}`);
  } catch {
    // ignore
  }
}
