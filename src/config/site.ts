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
