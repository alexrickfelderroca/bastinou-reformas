/**
 * Metadatos de las imágenes Open Graph (CLAUDE.pdf §8 — Fase 8). Módulo PURO
 * (sólo i18n, sin satori/sharp) para poder importarlo desde el Layout sin
 * arrastrar dependencias de Node a cada página. El render vive en `og-render.ts`.
 */
import { useTranslations, type Locale } from '../i18n/ui';

/** routeKeys que tienen página y para las que generamos una imagen OG propia. */
export const OG_ROUTE_IDS = [
  'home',
  'viviendas',
  'oficinas',
  'tiendas',
  'beauty',
  'precios',
  'proyectos',
  'nosotros',
  'contacto',
  'cookies',
] as const;

/** Ruta pública de la imagen OG de una página (la genera el endpoint /og/[og].png). */
export function ogImagePath(id: string, locale: Locale): string {
  return `/og/${id}-${locale}.png`;
}

/** Eyebrow + titular que se pintan en la tarjeta OG de cada página. */
export function ogContent(id: string, locale: Locale): { eyebrow: string; title: string } {
  const t = useTranslations(locale);
  const eyebrow = t('og.eyebrow');

  if (id.startsWith('proyecto-')) {
    const slug = id.slice('proyecto-'.length);
    return { eyebrow, title: t(`projects.${slug}.title`) };
  }

  const titles: Record<string, string> = {
    home: `${t('home.hero.line1')} ${t('home.hero.line2')}`,
    viviendas: t('landings.viviendas.h1'),
    oficinas: t('landings.oficinas.h1'),
    tiendas: t('landings.tiendas.h1'),
    beauty: t('landings.beauty.h1'),
    precios: t('prices.h1'),
    proyectos: t('portfolio.title'),
    nosotros: t('about.title'),
    contacto: t('contact.title'),
    cookies: t('cookies.title'),
    default: t('meta.tagline'),
  };
  return { eyebrow, title: titles[id] ?? t('meta.defaultTitle') };
}
