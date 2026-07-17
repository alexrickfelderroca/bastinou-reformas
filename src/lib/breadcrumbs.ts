/**
 * Ayuda para construir un BreadcrumbList de schema.org (CLAUDE.pdf §8 — Fase 8).
 * Cada item lleva una ruta relativa que se resuelve a URL absoluta con el
 * dominio del sitio. Las landings de servicio ya generan el suyo (Fase 3); este
 * helper cubre el resto (portfolio, proyecto, nosotros, contacto, calculadora).
 */
import { withTrailingSlash } from '../i18n/routes';

export function breadcrumbLd(base: URL, items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      // Barra final para coincidir con el canonical (evita redirección 301).
      item: new URL(withTrailingSlash(item.path), base).href,
    })),
  };
}
