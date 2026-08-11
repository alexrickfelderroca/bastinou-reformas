/**
 * Lógica de leads (CLAUDE.pdf §6): validación, formateo y envío por email
 * (Resend) + notificación opcional a Telegram. Sin SDKs: se usa fetch contra las
 * APIs REST. Todo va detrás de variables de entorno; si no están configuradas,
 * el lead se registra y se devuelve OK (útil en desarrollo) sin enviar nada.
 *
 * Variables ([PENDIENTE], ver .env.example):
 *   RESEND_API_KEY, LEAD_TO_EMAIL, LEAD_FROM_EMAIL
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (opcional)
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
  if (d.tipo || d.m2) {
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
  if (d.gclid) lines.push(`gclid: ${d.gclid}`);
  return lines.filter((l) => l !== '').join('\n');
}

async function sendEmail(d: LeadData): Promise<boolean> {
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
      subject: `Nuevo lead${d.service ? ` · ${d.service}` : ''} — ${d.name}`,
      text: leadToText(d),
    }),
  });
  return res.ok;
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
  const configured = Boolean(getEnv('RESEND_API_KEY') || getEnv('TELEGRAM_BOT_TOKEN'));
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
