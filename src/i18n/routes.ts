/**
 * Mapa de rutas con slugs traducidos por idioma (CLAUDE.pdf §4.1).
 * ES sin prefijo · CA en /ca · EN en /en. Cada slug lleva keywords en su idioma
 * (no se reutiliza el slug español). El selector de idioma y los hreflang se
 * generan a partir de este mapa, de modo que cambiar de idioma mantiene SIEMPRE
 * la misma página.
 */
import type { Locale } from './ui';
import { locales } from './ui';

export const routes = {
  home: { es: '/', ca: '/ca', en: '/en' },
  pisos: {
    es: '/reformas-pisos-barcelona',
    ca: '/ca/reformes-pisos-barcelona',
    en: '/en/apartment-renovation-barcelona',
  },
  casas: {
    es: '/reformas-casas-barcelona',
    ca: '/ca/reformes-cases-barcelona',
    en: '/en/house-renovation-barcelona',
  },
  oficinas: {
    es: '/reformas-oficinas-barcelona',
    ca: '/ca/reformes-oficines-barcelona',
    en: '/en/office-renovation-barcelona',
  },
  construccion: {
    es: '/construccion-barcelona',
    ca: '/ca/construccio-barcelona',
    en: '/en/construction-barcelona',
  },
  calculadora: {
    es: '/calculadora-reformas',
    ca: '/ca/calculadora-reformes',
    en: '/en/renovation-cost-calculator',
  },
  proyectos: { es: '/proyectos', ca: '/ca/projectes', en: '/en/projects' },
  nosotros: { es: '/nosotros', ca: '/ca/nosaltres', en: '/en/about' },
  contacto: { es: '/contacto', ca: '/ca/contacte', en: '/en/contact' },
  blog: { es: '/blog', ca: '/ca/blog', en: '/en/blog' },
  avisoLegal: { es: '/aviso-legal', ca: '/ca/avis-legal', en: '/en/legal-notice' },
  privacidad: { es: '/privacidad', ca: '/ca/privacitat', en: '/en/privacy-policy' },
  cookies: { es: '/politica-cookies', ca: '/ca/politica-cookies', en: '/en/cookie-policy' },
} as const satisfies Record<string, Record<Locale, string>>;

export type RouteKey = keyof typeof routes;

/** Ruta localizada para una página en un idioma concreto. */
export function localizedPath(key: RouteKey, locale: Locale): string {
  return routes[key][locale];
}

/**
 * Normaliza a la convención con barra final (Astro sirve en formato "directory",
 * y el canonical/og:url/sitemap llevan barra final). Así hreflang, breadcrumbs y
 * selector de idioma apuntan a la URL canónica sin saltos de redirección 301.
 */
export function withTrailingSlash(path: string): string {
  if (path === '/') return '/';
  return path.endsWith('/') ? path : `${path}/`;
}

/** Todas las variantes de idioma de una página (para hreflang y el selector). */
export function alternatesFor(key: RouteKey): { locale: Locale; path: string }[] {
  return locales.map((locale) => ({ locale, path: withTrailingSlash(routes[key][locale]) }));
}

/** Dada una URL, deduce a qué RouteKey corresponde (para el selector de idioma). */
export function routeKeyFromPath(pathname: string): RouteKey | null {
  const clean = pathname.replace(/\/+$/, '') || '/';
  for (const key of Object.keys(routes) as RouteKey[]) {
    for (const locale of locales) {
      const p = routes[key][locale].replace(/\/+$/, '') || '/';
      if (p === clean) return key;
    }
  }
  return null;
}
