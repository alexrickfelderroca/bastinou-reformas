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
  email: 'admin@kobor.es',

  // Dirección / zona de servicio: Barcelona y alrededores hasta 50 km.
  // Calle y CP confirmados por el propietario (ago-2026): es su dirección,
  // aunque el listado de Google en ese punto pertenezca a otro negocio.
  address: {
    street: 'Av. Can Fatjó dels Aurons, 15',
    city: 'Barcelona / Sant Cugat del Vallès',
    region: 'Cataluña',
    postalCode: '08174',
    country: 'ES',
  },
  areaServed: ['Barcelona', 'Área metropolitana de Barcelona'],

  // Coordenadas del local para el JSON-LD (GeoCoordinates) y el mapa. Extraídas
  // del embed que facilitó el propietario (ago-2026).
  geo: { lat: 41.489689, lng: 2.080816 } as { lat: number; lng: number } | null,

  // Google Maps: embed (iframe de la página de contacto) y enlace "Cómo llegar".
  // OJO: ambos van por COORDENADAS a propósito. El listado de Google en esta
  // dirección ("Serres Wrap Center") NO es la empresa: un embed/destino "de
  // lugar" mostraría su ficha, su nombre y sus reseñas. Con lat,lng el mapa
  // queda interactivo con un pin sin marca y la dirección la pinta nuestro
  // propio HTML. No volver al embed de lugar.
  // Nota: la query de texto de la dirección tampoco sirve — Google la geocoda
  // mal (Av. Can Fatjó dels Aurons de Cerdanyola, otro punto).
  maps: {
    embedUrl: 'https://maps.google.com/maps?q=41.489689,2.080816&z=17&hl=es&output=embed',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=41.489689,2.080816',
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
// El ID del contenedor es público por diseño (va en el HTML), así que vive aquí
// como valor por defecto y `PUBLIC_GTM_ID` lo puede sobreescribir en el build.
export const gtmId = (import.meta.env.PUBLIC_GTM_ID ?? 'GTM-PHVSZV97').trim();

/** Sólo se considera activo con un ID de contenedor real (GTM-XXXXXXX). El
 *  placeholder o una cadena vacía dejan el tracking dormido. */
export const gtmEnabled = /^GTM-[A-Z0-9]+$/.test(gtmId);

/**
 * ID del proyecto de Microsoft Clarity (mapas de calor y grabaciones de sesión).
 * Mismo patrón que GTM: es público por diseño (aparece en la URL del script,
 * https://www.clarity.ms/tag/{id}), así que va por `PUBLIC_CLARITY_ID` (ver
 * `.env.example`). Clarity NO entiende Consent Mode: se gatea por inyección
 * diferida en `ConsentClarity.astro`, dentro de la categoría de analítica.
 */
export const clarityId = (import.meta.env.PUBLIC_CLARITY_ID ?? '').trim();

/** Sólo activo con un ID de proyecto con pinta real (cadena alfanumérica corta,
 *  p. ej. "abcd1efgh2"). Vacío o con formato extraño ⇒ ni rastro de Clarity en
 *  el HTML generado (gate de build en Layout.astro). */
export const clarityEnabled = /^[a-z0-9]{4,32}$/i.test(clarityId);
