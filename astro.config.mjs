// @ts-check
import { defineConfig } from 'astro/config';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

const canonicalGateModule = fileURLToPath(new URL('./src/server/canonical-gate.ts', import.meta.url));
const headerPolicyModule = fileURLToPath(new URL('./src/server/header-policy.mjs', import.meta.url));

/**
 * El adaptador Node sirve dist/client ANTES de la app, así que el middleware
 * no ve /contacto, /index.html ni el host www. Este plugin inyecta el gate
 * delante de ese handler estático, y también la política de Cache-Control /
 * Content-Type (src/server/header-policy.mjs). Va dentro de
 * dist/server/entry.mjs porque Hostinger arranca ese archivo directamente
 * (Entry file del panel), no `npm start`.
 *
 * No usamos `trailingSlash: 'always'`: en standalone ese ajuste redirige en el
 * handler estático con un Location relativo (www y la barra serían dos 301) y
 * también redirige POST /api/lead. La barra, www, index.html y las URL
 * antiguas se resuelven juntas en src/lib/canonical-request.ts.
 */
function koborCanonicalPlugin() {
  const virtualId = 'virtual:kobor-canonical';
  const resolvedVirtualId = `\0${virtualId}`;
  return {
    name: 'kobor-canonical-http',
    enforce: 'pre',
    resolveId(id) {
      if (id === virtualId) return resolvedVirtualId;
    },
    load(id) {
      if (id === resolvedVirtualId) {
        return [
          `export { canonicalGate } from ${JSON.stringify(canonicalGateModule)};`,
          `export { installHeaderPolicy } from ${JSON.stringify(headerPolicyModule)};`,
        ].join('\n');
      }
    },
    transform(code, id) {
      const norm = id.split('\\').join('/');
      if (!norm.includes('/@astrojs/node/dist/standalone.js')) return;
      const needle = 'staticHandler(req, res, () => appHandler(req, res));';
      if (!code.includes(needle)) return;
      return {
        code: `import { canonicalGate, installHeaderPolicy } from ${JSON.stringify(virtualId)};\n${code.replace(
          needle,
          'installHeaderPolicy(req, res);\n    if (canonicalGate(req, res)) return;\n    staticHandler(req, res, () => appHandler(req, res));',
        )}`,
        map: null,
      };
    },
  };
}

/** Falla el build si el gate no llegó a dist/server (las redirecciones de estáticos no existirían). */
function koborCanonicalCheck() {
  return {
    name: 'kobor-canonical-check',
    hooks: {
      'astro:build:done': () => {
        const root = fileURLToPath(new URL('./dist/server', import.meta.url));
        const stack = [root];
        let found = false;
        let policy = false;
        while (stack.length) {
          const dir = stack.pop();
          if (!dir) break;
          for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = join(dir, entry.name);
            if (entry.isDirectory()) stack.push(full);
            else if (entry.isFile() && statSync(full).isFile() && /\.(mjs|js|cjs)$/.test(entry.name)) {
              const src = readFileSync(full, 'utf8');
              if (src.includes('kobor-pre-static-gate')) found = true;
              if (src.includes('kobor-header-policy')) policy = true;
            }
          }
        }
        if (!found) {
          throw new Error(
            'El gate canónico no está en dist/server. www, index.html y la barra no redirigirían en los HTML prerenderizados.',
          );
        }
        if (!policy) {
          throw new Error(
            'La política de caché no está en dist/server. Con Hostinger arrancando dist/server/entry.mjs, el HTML saldría sin s-maxage y el .webm sin su tipo.',
          );
        }
      },
    },
  };
}

// Site URL. Used for canonicals, sitemap, hreflang, OG.
const SITE = 'https://kobor.es';

// https://astro.build/config
export default defineConfig({
  site: SITE,

  // Rutas antiguas (rebranding jul-2026): 301 real en src/lib/canonical-request.ts
  // (mismo salto que www, la barra final e index.html). Ya no hay stubs HTML.

  // Salida estática por defecto: todo el contenido se prerenderiza (SEO). Sólo
  // las rutas con `prerender = false` (p. ej. /api/lead) corren en servidor.
  // El adaptador Node standalone genera dist/server/entry.mjs. En producción
  // (Hostinger) el panel arranca dist/server/entry.mjs directamente; ese entry
  // ya lleva Cache-Control / Content-Type (src/server/header-policy.mjs).
  // `npm start` (server/start.mjs) importa el mismo entry y da lo mismo.
  // Sirve tanto los estáticos de dist/client como la ruta SSR. Servir dist/
  // como estático sin proceso Node da 403: el index vive en dist/client.
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
    // Las URL antiguas ya no son páginas: el 301 vive en el gate y no entran
    // en el sitemap. Las noindex de Ads, OAuth y el panel siguen fuera.
    // lastmod = fecha de build (el integrador la aplica a cada URL).
    sitemap({
      lastmod: new Date(),
      filter: (page) =>
        ![
          // Landing de Google Ads (noindex): fuera del sitemap.
          '/reformas-integrales-barcelona/',
          // Página de propósito de la app OAuth (noindex). La exige la brand
          // verification de Google Cloud; no es contenido del sitio comercial.
          '/google-ads-api-tool/',
          // Política de privacidad del Panel KOBOR (noindex). La exige la
          // revisión de aplicaciones de Meta para el acceso avanzado a los
          // mensajes de Instagram; tampoco es contenido del sitio comercial.
          '/privacidad-panel/',
        ].some((old) => page.endsWith(old)),
    }),
    koborCanonicalCheck(),
  ],

  vite: {
    plugins: [koborCanonicalPlugin(), tailwindcss()],
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
