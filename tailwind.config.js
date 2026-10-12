/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        // -----------------------------------------------------------------
        // Cyber-Travel surfaces. The `mono` scale is *remapped* to a deep
        // space / slate palette so every existing `bg-mono-900`,
        // `border-mono-800`, `text-mono-400` class instantly becomes the new
        // glassmorphic theme. 950 = page background, 900 = card glass.
        // -----------------------------------------------------------------
        mono: {
          50: '#ffffff',
          100: '#e2e8f0', // slate-200 — bright text
          200: '#cbd5e1', // slate-300 — body text
          300: '#94a3b8', // slate-400 — secondary
          400: '#7c8798', // muted
          500: '#64748b', // slate-500
          600: '#475569', // slate-600
          700: '#334155', // slate-700 — strong border
          800: '#1e293b', // slate-800 — default border
          850: '#0f172a', // slate-900 — inset surface
          900: '#0b1120', // card surface
          950: '#030712', // gray-950 — deep space background
        },
        // Alias so older `ink-*` utilities keep working.
        ink: {
          50: '#ffffff',
          100: '#e2e8f0',
          200: '#cbd5e1',
          300: '#94a3b8',
          400: '#7c8798',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          850: '#0f172a',
          900: '#0b1120',
          950: '#030712',
        },
        // Live GPS / distance polyline.
        accent: {
          DEFAULT: '#10b981',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        // Electric-blue interactive accent (routes, links, info).
        electric: {
          DEFAULT: '#3b82f6',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
        },
        // Neon purple — the signature brand glow.
        neon: {
          DEFAULT: '#8b5cf6',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        // Neon crimson — SOS / danger.
        sos: {
          DEFAULT: '#f43f5e',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
        },
        // Broadcast severities.
        notice: {
          DEFAULT: '#3b82f6',
          300: '#93c5fd',
          500: '#3b82f6',
          600: '#2563eb',
        },
        warning: {
          DEFAULT: '#f59e0b',
          300: '#fcd34d',
          500: '#f59e0b',
          600: '#d97706',
        },
      },
      backgroundImage: {
        'neon-tri': 'linear-gradient(to right, #7c3aed, #4f46e5 45%, #06b6d4)',
        'neon-soft': 'linear-gradient(135deg, rgba(124,58,237,0.35), rgba(6,182,212,0.28))',
        'neon-ring':
          'conic-gradient(from 0deg, #8b5cf6, #06b6d4, #10b981, #f59e0b, #f43f5e, #8b5cf6)',
      },
      boxShadow: {
        card: '0 8px 30px rgba(0, 0, 0, 0.6)',
        lift: '0 24px 60px -20px rgba(0, 0, 0, 0.85)',
        glow: '0 0 25px rgba(139, 92, 246, 0.5)',
        glowViolet: '0 0 25px rgba(139, 92, 246, 0.55)',
        glowCyan: '0 0 25px rgba(6, 182, 212, 0.45)',
        glowEmerald: '0 0 18px rgba(16, 185, 129, 0.45)',
        glowRose: '0 0 22px rgba(244, 63, 94, 0.5)',
        glowAmber: '0 0 20px rgba(245, 158, 11, 0.45)',
        neon: '0 0 0 1px rgba(139,92,246,0.35), 0 0 30px rgba(139,92,246,0.35)',
        inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.06)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(10px) scale(0.97)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(100%)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-7px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
        'pop-in': 'pop-in 0.22s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up': 'slide-up 0.28s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.25s ease-out both',
        shimmer: 'shimmer 1.6s linear infinite',
        'gradient-x': 'gradient-x 6s ease infinite',
        float: 'float 5s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
