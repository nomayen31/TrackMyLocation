import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Where the dev server forwards API + Socket.IO traffic.
 *
 *   npm run dev                                  → http://localhost:5000 (cloud backend)
 *   VITE_PROXY_TARGET=http://localhost:3000 npm run dev   → LAN / hotspot backend
 *
 * This keeps relative calls like `/api/lan/info` working during development,
 * exactly like the production same-origin setup on the Pi.
 */
const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: proxyTarget,
        changeOrigin: true,
        ws: true,
        secure: false,
      },
    },
  },
});
