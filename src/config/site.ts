/**
 * Datos de la empresa. Se entregan por separado (CLAUDE.pdf §8, §10).
 * Hasta entonces: placeholders claros [PENDIENTE]. Cambiar SOLO aquí.
 */
export const site = {
  name: 'Bastinou',
  legalName: '[PENDIENTE: razón social]',
  nif: '[PENDIENTE: NIF/CIF]',

  // Contacto — usados en header, footer, tel:, wa.me y JSON-LD.
  phone: '[PENDIENTE: +34 600 000 000]',
  phoneHref: '+34600000000', // formato E.164 sin espacios para tel: y wa.me
  whatsapp: '34600000000', // número wa.me sin '+'
  email: 'info@bastinou.com', // [PENDIENTE: email real]

  // Dirección / zona de servicio.
  address: {
    street: '[PENDIENTE: dirección]',
    city: 'Barcelona',
    region: 'Cataluña',
    postalCode: '[PENDIENTE]',
    country: 'ES',
  },
  areaServed: ['Barcelona', 'Cataluña'],

  // Horario comercial (para JSON-LD y footer). [PENDIENTE: confirmar].
  openingHours: 'Lun–Vie 09:00–19:00',

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
