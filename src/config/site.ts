/**
 * Datos de la empresa. Se entregan por separado (CLAUDE.pdf §8, §10).
 * Hasta entonces: placeholders claros [PENDIENTE]. Cambiar SOLO aquí.
 */
export const site = {
  name: 'Kobor',
  legalName: '[PENDIENTE: razón social]',
  nif: '[PENDIENTE: NIF/CIF]',

  // Contacto — usados en header, footer, tel:, wa.me y JSON-LD.
  phone: '+34 623 80 81 72',
  phoneHref: '+34623808172', // formato E.164 sin espacios para tel: y wa.me
  whatsapp: '34623808172', // número wa.me sin '+'
  email: 'admin@kobor.com',

  // Dirección / zona de servicio: Barcelona y alrededores hasta 50 km.
  // Calle y CP tomados del listado de Google Maps del local (pin del embed
  // facilitado por el propietario, ago-2026).
  address: {
    street: 'Av. Can Fatjó dels Aurons, 15',
    city: 'Barcelona / Sant Cugat del Vallès',
    region: 'Cataluña',
    postalCode: '08174',
    country: 'ES',
  },
  areaServed: ['Barcelona', 'Área metropolitana de Barcelona'],

  // Coordenadas del local para el JSON-LD (GeoCoordinates). Extraídas del embed
  // de Google Maps facilitado por el propietario (ago-2026). El pin de Google
  // corresponde al listado "Serres Wrap Center" (Sant Cugat del Vallès), la
  // misma dirección desde la que opera Kobor.
  geo: { lat: 41.489689, lng: 2.080816 } as { lat: number; lng: number } | null,

  // Google Maps: embed (iframe de la página de contacto) y enlace "Cómo llegar".
  // El embed lo entregó el propietario tal cual desde Maps → Compartir → Insertar mapa.
  maps: {
    embedUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d747.1682475348857!2d2.08081592855845!3d41.48968869819793!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2027f0d4ea2a70f1%3A0xc8f7c6ce9b2a429d!2sSerres%20Wrap%20Center!5e0!3m2!1sen!2ses!4v1786619018289!5m2!1sen!2ses',
    directionsUrl:
      'https://www.google.com/maps/dir/?api=1&destination=Serres+Wrap+Center,+Sant+Cugat+del+Vall%C3%A8s',
  },

  // Horario comercial (para JSON-LD y footer). Se muestra en pie y contacto.
  openingHours: 'Lun–Sáb 09:00–19:00',

  // Redes (opcional). Vacío = no se muestra.
  social: {
    instagram: '',
    facebook: '',
    linkedin: '',
  },
} as const;

/** Enlace tel: normalizado. */
export const telHref = `tel:${site.phoneHref}`;

/** Construye un enlace de WhatsApp con mensaje prellenado. */
export function whatsappHref(message: string): string {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`;
}

/* -------------------------------------------------------------------------- */
/* Analítica / Tracking (Fase 7)                                              */
/* -------------------------------------------------------------------------- */
/**
 * ID del contenedor de Google Tag Manager. NO es secreto (aparece en el HTML),
 * por eso va por variable de entorno pública `PUBLIC_GTM_ID` (ver `.env.example`)
 * en vez de en un secreto de servidor. GA4 y las conversiones de Google Ads se
 * configuran DENTRO del contenedor de GTM, no aquí. [PENDIENTE: GTM-XXXXXXX].
 *
 * Todo el stack de tracking (Consent Mode v2 + banner de cookies + eventos) está
 * escrito y listo, pero permanece DORMIDO hasta que se defina un ID real: sin él
 * no se carga GTM ni se auto-muestra el banner (no hay cookies que consentir).
 */
export const gtmId = (import.meta.env.PUBLIC_GTM_ID ?? '').trim();

/** Sólo se considera activo con un ID de contenedor real (GTM-XXXXXXX). El
 *  placeholder o una cadena vacía dejan el tracking dormido. */
export const gtmEnabled = /^GTM-[A-Z0-9]+$/.test(gtmId);
