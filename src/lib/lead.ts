/**
 * Lógica de leads (CLAUDE.pdf §6): validación, formateo y envío por email
 * + notificación opcional a Telegram. Todo va detrás de variables de entorno;
 * si no están configuradas, el lead se registra en el log y se devuelve OK
 * (útil en desarrollo) sin enviar nada.
 *
 * Email — dos vías, en este orden (ver .env.example):
 *   1. Resend (fetch a su API REST):  RESEND_API_KEY + LEAD_TO_EMAIL
 *   2. SMTP (nodemailer; pensado para el buzón de Hostinger, p. ej.
 *      admin@kobor.es):  SMTP_HOST + SMTP_USER + SMTP_PASS + LEAD_TO_EMAIL
 * Con ambas configuradas, Resend tiene prioridad y SMTP hace de respaldo si
 * Resend falla. LEAD_FROM_EMAIL es opcional en las dos.
 *
 * Telegram (opcional): TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
 */

export interface LeadData {
  name: string;
  phone: string;
  email?: string;
  message?: string;
  service?: string;
  source?: string;
  locale?: string;
  // Parámetros de la calculadora (opcionales).
  tipo?: string;
  obra?: string;
  m2?: string;
  segmento?: string;
  precioMin?: string;
  precioMax?: string;
  plazo?: string;
  municipio?: string;
  // Origen / atribución.
  page?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  // `utm_term` es la keyword que disparó el anuncio: el dato más útil para
  // decidir qué palabras pausar. `forms.ts` ya los captura; hasta ahora se
  // perdían aquí y nunca llegaban al email.
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
}

export interface Validation {
  ok: boolean;
  errors: Record<string, string>;
}

/** Validación de servidor (además de la de cliente). */
export function validateLead(d: Partial<LeadData>): Validation {
  const errors: Record<string, string> = {};
  if (!d.name || d.name.trim().length < 2) errors.name = 'required';
  const phone = (d.phone || '').replace(/[\s.\-()]/g, '');
  if (!phone || !/^\+?\d{7,15}$/.test(phone)) errors.phone = 'invalid';
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) errors.email = 'invalid';
  return { ok: Object.keys(errors).length === 0, errors };
}

function getEnv(key: string): string | undefined {
  // Dev/build: import.meta.env (.env de Vite). Runtime Node: process.env.
  const im = (import.meta as unknown as { env?: Record<string, string> }).env;
  return im?.[key] ?? (typeof process !== 'undefined' ? process.env?.[key] : undefined);
}

/** Resumen legible del lead con todos los parámetros. */
export function leadToText(d: LeadData): string {
  const lines: string[] = [
    `Nombre: ${d.name}`,
    `Teléfono: ${d.phone}`,
    d.email ? `Email: ${d.email}` : '',
    d.service ? `Servicio: ${d.service}` : '',
    d.message ? `Mensaje: ${d.message}` : '',
    '',
  ];
  // Cualquier campo de la calculadora abre el bloque, no solo `tipo` y `m2`.
  // En /precios el municipio es OBLIGATORIO: con la condición anterior, quien
  // dejaba los m² vacíos hacía que un dato que sí había rellenado no saliera
  // nunca del sitio.
  if (d.tipo || d.m2 || d.obra || d.segmento || d.municipio || d.plazo || d.precioMin) {
    lines.push('— Cálculo —');
    if (d.tipo) lines.push(`Tipo: ${d.tipo}`);
    if (d.obra) lines.push(`Obra: ${d.obra}`);
    if (d.m2) lines.push(`Superficie: ${d.m2} m²`);
    if (d.segmento) lines.push(`Segmento: ${d.segmento}`);
    if (d.precioMin && d.precioMax) lines.push(`Horquilla: ${d.precioMin}–${d.precioMax} €`);
    if (d.municipio) lines.push(`Municipio: ${d.municipio}`);
    if (d.plazo) lines.push(`Plazo: ${d.plazo}`);
    lines.push('');
  }
  lines.push('— Origen —');
  lines.push(`Página: ${d.page || '-'}`);
  lines.push(`Idioma: ${d.locale || '-'}`);
  lines.push(`Fuente form: ${d.source || '-'}`);
  if (d.utm_source) lines.push(`utm_source: ${d.utm_source}`);
  if (d.utm_medium) lines.push(`utm_medium: ${d.utm_medium}`);
  if (d.utm_campaign) lines.push(`utm_campaign: ${d.utm_campaign}`);
  if (d.utm_term) lines.push(`utm_term: ${d.utm_term}`);
  if (d.utm_content) lines.push(`utm_content: ${d.utm_content}`);
  if (d.gclid) lines.push(`gclid: ${d.gclid}`);
  return lines.filter((l) => l !== '').join('\n');
}

function leadSubject(d: LeadData): string {
  return `Nuevo lead${d.service ? ` · ${d.service}` : ''} — ${d.name}`;
}

async function sendEmailResend(d: LeadData): Promise<boolean> {
  const key = getEnv('RESEND_API_KEY');
  const to = getEnv('LEAD_TO_EMAIL');
  const from = getEnv('LEAD_FROM_EMAIL') || 'Kobor <leads@kobor.es>';
  if (!key || !to) return false;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: d.email || undefined,
      subject: leadSubject(d),
      text: leadToText(d),
    }),
  });
  return res.ok;
}

/** Envío por SMTP autenticado (buzón de Hostinger u otro proveedor). */
async function sendEmailSmtp(d: LeadData): Promise<boolean> {
  const host = getEnv('SMTP_HOST');
  const user = getEnv('SMTP_USER');
  const pass = getEnv('SMTP_PASS');
  const to = getEnv('LEAD_TO_EMAIL');
  if (!host || !user || !pass || !to) return false;
  // Import dinámico: nodemailer solo se carga si esta vía está configurada.
  const { default: nodemailer } = await import('nodemailer');
  const port = Number(getEnv('SMTP_PORT') || 465);
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = TLS implícito; 587/25 negocian STARTTLS
    auth: { user, pass },
  });
  const info = await transport.sendMail({
    // Muchos SMTP (Hostinger incluido) exigen que el From sea el buzón autenticado.
    from: getEnv('LEAD_FROM_EMAIL') || `Kobor <${user}>`,
    to,
    replyTo: d.email || undefined,
    subject: leadSubject(d),
    text: leadToText(d),
  });
  return info.accepted.length > 0;
}

/** Email por la primera vía que funcione: Resend y, si no, SMTP. */
async function sendEmail(d: LeadData): Promise<boolean> {
  try {
    if (await sendEmailResend(d)) return true;
  } catch {
    /* caer a SMTP */
  }
  return sendEmailSmtp(d);
}

async function sendTelegram(d: LeadData): Promise<boolean> {
  const token = getEnv('TELEGRAM_BOT_TOKEN');
  const chat = getEnv('TELEGRAM_CHAT_ID');
  if (!token || !chat) return false;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: `🏗️ Nuevo lead Kobor\n\n${leadToText(d)}` }),
  });
  return res.ok;
}

/** Envía el lead por los canales configurados. Devuelve los que funcionaron. */
export async function sendLead(d: LeadData): Promise<{ sent: string[]; configured: boolean }> {
  const configured = Boolean(
    getEnv('RESEND_API_KEY') || getEnv('SMTP_HOST') || getEnv('TELEGRAM_BOT_TOKEN')
  );
  const sent: string[] = [];
  const results = await Promise.allSettled([sendEmail(d), sendTelegram(d)]);
  if (results[0].status === 'fulfilled' && results[0].value) sent.push('email');
  if (results[1].status === 'fulfilled' && results[1].value) sent.push('telegram');
  if (!configured) {
    // Sin credenciales: registrar para no perder el lead en desarrollo.
    console.log('[lead] (sin envío, faltan credenciales)\n' + leadToText(d));
  }
  return { sent, configured };
}
