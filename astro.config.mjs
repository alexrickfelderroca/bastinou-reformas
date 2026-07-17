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
    sitemap({
      i18n: {
        defaultLocale: 'es',
        locales: { es: 'es-ES', ca: 'ca-ES', en: 'en' },
      },
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
