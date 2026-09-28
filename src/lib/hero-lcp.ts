/**
 * Recursos del póster del hero (LCP de la home).
 * El móvil y el escritorio son encuadres distintos (vertical / horizontal),
 * no solo anchos de la misma foto: <picture> + media, y el mismo par en el preload.
 */
export const HERO_MOBILE_MEDIA = '(max-width: 800px)';
export const HERO_DESKTOP_MEDIA = '(min-width: 801px)';

export const heroLcpPreloads = [
  { href: '/hero/hero-mobile.avif', type: 'image/avif', media: HERO_MOBILE_MEDIA },
  { href: '/hero/hero-desktop.avif', type: 'image/avif', media: HERO_DESKTOP_MEDIA },
] as const;
