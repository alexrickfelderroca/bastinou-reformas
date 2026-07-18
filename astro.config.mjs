// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

// Site URL — [PENDIENTE: dominio real]. Used for canonicals, sitemap, hreflang, OG.
const SITE = 'https://www.bastinou.com';

// https://astro.build/config
export default defineConfig({
  site: SITE,

  // Salida estática por defecto: todo el contenido se prerenderiza (SEO). Sólo
  // las rutas marcadas con `prerender = false` (p. ej. /api/lead) se ejecutan
  // en el servidor. Adaptador Node neutro para desarrollo/preview; se cambia por
  // el del hosting elegido (Vercel/Netlify/Cloudflare) en una línea al desplegar.
  adapter: node({ mode: 'standalone' }),

  // ES is the default language and lives at the root (no prefix).
  // CA and EN are served under /ca and /en. Translated slugs are handled
  // per-page (see src/i18n/routes.ts), so default-locale redirect stays off.
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'ca', 'en'],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },

  integrations: [
    react(),
    // Sitemap plano. No usamos la opción `i18n` del integrador: empareja idiomas
    // por ruta idéntica, pero nuestros slugs están traducidos (no coinciden), así
    // que sólo enlazaría la home y dejaría el resto sin alternates. El hreflang
    // autoritativo y completo va en el <head> de cada página (routes.ts).
    sitemap(),
  ],

  vite: {
    plugins: [tailwindcss()],
    // React 19 splits its runtime and its "shared internals" across the `react`
    // and `react-dom` packages. If Vite pre-bundles them into separate instances,
    // react-dom sets the hooks dispatcher on one copy while the component reads it
    // from another → `Cannot read properties of null (reading 'useState')` and the
    // island never hydrates (calculadora en blanco). Deduping + co-optimising every
    // React entrypoint forces a single shared instance in dev and preview.
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
      ],
    },
  },
});
