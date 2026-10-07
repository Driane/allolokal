/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // ─── AJOUT : active la stratégie de classe pour dark/premium ─────────────
  darkMode: 'class',
  // ─────────────────────────────────────────────────────────────────────────
  theme: {
    extend: {
      colors: {
        // Couleurs legacy (conservées pour compatibilité descendante)
        dark: {
          900: '#0b0e14',
          800: '#1a1d29',
          700: '#2a2e3f',
        },
        // ─── AJOUT : couleurs sémantiques via variables CSS ───────────────
        // Usage : bg-theme-bg, text-theme-text, border-theme-border, etc.
        theme: {
          bg:        'var(--color-bg-primary)',
          'bg-card': 'var(--color-bg-secondary)',
          'bg-soft': 'var(--color-bg-tertiary)',
          text:      'var(--color-text-main)',
          muted:     'var(--color-text-muted)',
          accent:    'var(--color-accent)',
          'accent-h':'var(--color-accent-hover)',
          border:    'var(--color-border)',
          shadow:    'var(--color-shadow)',
        },
        // ─────────────────────────────────────────────────────────────────
      },
    },
  },
  plugins: [],
}