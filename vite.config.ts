import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'iOS >= 13', 'Safari >= 13'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
    }),
    // Activé uniquement avec ANALYZE=true (ex: npm run analyze)
    ...(process.env.ANALYZE === 'true'
      ? [visualizer({ open: false, filename: 'stats.html', gzipSize: true, brotliSize: false })]
      : []),
  ],

  build: {
    target: 'es2015',
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /node_modules\/(react|react-dom|react-router-dom|scheduler|framer-motion)\//,
              priority: 20,
            },
            {
              name: 'vendor-supabase',
              test: /node_modules\/@supabase\//,
              priority: 15,
            },
            {
              name: 'vendor-i18n',
              test: (id: string) => {
                const p = id.replace(/\\/g, '/');
                return /node_modules\/(i18next|react-i18next)\//.test(p)
                  || /\/src\/locales\/[^/]+\.json$/.test(p);
              },
              priority: 10,
            },
          ],
        },
      },
    },
  },
})
