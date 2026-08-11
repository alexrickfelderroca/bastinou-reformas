// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

// Site URL. Used for canonicals, sitemap, hreflang, OG.
const SITE = 'https://kobor.es';

// https://astro.build/config
export default defineConfig({
  site: SITE,

  // Rutas antiguas (rebranding jul-2026) → nuevas. NO se usan los `redirects`
  // del config: en el build estático no generan stubs y el hosting interino
  // (GitHub Pages) devolvería 404. En su lugar hay páginas físicas con
  // meta-refresh + canonical + noindex (src/components/RedirectStub.astro),
  // que funcionan igual en estático y en SSR.

  // Salida servidor: el sitio se sirve con el servidor Node standalone
  // (dist/server/entry.mjs → `npm start`), que también sirve los estáticos de
  // dist/client. Necesario en el hosting (Hostinger): sin proceso Node, servir
  // dist/ como estático da 403 porque el index vive en dist/client, no en la raíz.
  // Las rutas con `prerender = true` (og, robots y las fichas de proyecto con
  // getStaticPaths) se generan en build; el resto se renderiza on demand.
  // /api/lead (prerender = false) siempre corre en servidor.
  output: 'server',
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
    // Los stubs de redirección (URLs antiguas, noindex) se excluyen.
    sitemap({
      filter: (page) =>
        ![
          '/reformas-pisos-barcelona/',
          '/reformas-casas-barcelona/',
          '/construccion-barcelona/',
          '/calculadora-reformas/',
          '/ca/reformes-pisos-barcelona/',
          '/ca/reformes-cases-barcelona/',
          '/ca/construccio-barcelona/',
          '/ca/calculadora-reformes/',
          '/en/apartment-renovation-barcelona/',
          '/en/house-renovation-barcelona/',
          '/en/construction-barcelona/',
          '/en/renovation-cost-calculator/',
          '/proyectos/casa-espana/',
        ].some((old) => page.endsWith(old)),
    }),
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
