/**
 * Endpoint de captación de leads (CLAUDE.pdf §6). Ruta on-demand (no se
 * prerenderiza). Valida en servidor, filtra spam con honeypot y envía el lead
 * por email/Telegram (src/lib/lead.ts). Acepta JSON (fetch, con JS) y
 * form-urlencoded (fallback sin JS → redirección).
 *
 * Antispam: honeypot (campo `project_ref`; se acepta el nombre antiguo
 * `company` por páginas cacheadas). [PENDIENTE: añadir reCAPTCHA v3 o
 * Turnstile cuando haya claves — validar el token aquí.]
 */
import type { APIRoute } from 'astro';
import { validateLead, sendLead, type LeadData } from '../../lib/lead';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request, redirect }) => {
  const ctype = request.headers.get('content-type') || '';
  const isJson = ctype.includes('application/json');

  let raw: Record<string, string> = {};
  try {
    if (isJson) {
      raw = (await request.json()) as Record<string, string>;
    } else {
      const form = await request.formData();
      for (const [k, v] of form.entries()) raw[k] = String(v);
    }
  } catch {
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  // Honeypot: si el campo oculto viene relleno, es un bot. Fingimos éxito.
  // El descarte SIEMPRE se registra: un honeypot silencioso ya nos costó leads
  // humanos cuando el autofill del navegador rellenaba el antiguo campo
  // "company" con el perfil del visitante (ago-2026).
  const hp = (raw.project_ref || raw.company || '').trim();
  if (hp !== '') {
    console.log(`[lead] descartado por honeypot (valor: ${JSON.stringify(hp.slice(0, 60))}) — ${raw.name || '?'} / ${raw.phone || '?'}`);
    return isJson ? json({ ok: true }) : redirect('/?lead=ok', 303);
  }

  const { ok, errors } = validateLead(raw);
  if (!ok) {
    return isJson ? json({ ok: false, errors }, 422) : redirect('/?lead=error', 303);
  }

  const lead: LeadData = {
    name: raw.name,
    phone: raw.phone,
    email: raw.email || undefined,
    message: raw.message || undefined,
    service: raw.service || undefined,
    source: raw.source || 'form',
    locale: raw.locale || undefined,
    tipo: raw.tipo || undefined,
    obra: raw.obra || undefined,
    m2: raw.m2 || undefined,
    segmento: raw.segmento || undefined,
    precioMin: raw.precioMin || undefined,
    precioMax: raw.precioMax || undefined,
    plazo: raw.plazo || undefined,
    municipio: raw.municipio || undefined,
    page: raw.page || undefined,
    utm_source: raw.utm_source || undefined,
    utm_medium: raw.utm_medium || undefined,
    utm_campaign: raw.utm_campaign || undefined,
    gclid: raw.gclid || undefined,
  };

  try {
    const result = await sendLead(lead);
    return isJson ? json({ ok: true, ...result }) : redirect('/?lead=ok', 303);
  } catch {
    return isJson ? json({ ok: false, error: 'send_failed' }, 502) : redirect('/?lead=error', 303);
  }
};

// GET informativo (evita 404 confuso si se visita la ruta directamente).
export const GET: APIRoute = () => json({ ok: false, error: 'method_not_allowed' }, 405);
