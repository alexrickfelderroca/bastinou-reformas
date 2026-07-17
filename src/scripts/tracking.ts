/**
 * Eventos de clic de contacto → dataLayer (CLAUDE.pdf §7 — Fase 7).
 *
 * Un único listener delegado captura todos los enlaces de WhatsApp ([data-wa],
 * con `data-wa-source` = fab | contact | final-cta | quote-form | landing-<svc>)
 * y de teléfono ([data-phone]) del sitio, y empuja `whatsapp_click` / `phone_click`
 * al dataLayer. Se disparan SIEMPRE, con o sin consentimiento: son las conversiones
 * principales de Google Ads y alimentan el modelado de Consent Mode; el estado de
 * consentimiento sólo condiciona el comportamiento de red de las etiquetas, no el
 * push al dataLayer (ad_storage denegado + ads_data_redaction lo mantienen conforme).
 *
 * El botón de WhatsApp de la calculadora NO lleva [data-wa] a propósito: emite su
 * propio `calc_whatsapp_click` con contexto del cálculo. No lo dupliques aquí.
 */
interface DataLayerEvent {
  event: string;
  [key: string]: unknown;
}

function push(payload: DataLayerEvent): void {
  const w = window as unknown as { dataLayer?: DataLayerEvent[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push(payload);
}

// Anti-duplicado: un mismo enlace puede disparar dos clics (touch + click) en
// <800 ms. Deduplicamos por ELEMENTO, no por (evento|origen): así dos enlaces
// de teléfono distintos (cabecera, pie, formulario…) nunca se colapsan entre sí.
let lastEl: Element | null = null;
let lastAt = 0;

document.addEventListener(
  'click',
  (e) => {
    const target = e.target as HTMLElement | null;
    const wa = target?.closest?.('[data-wa]') as HTMLElement | null;
    const phone = wa ? null : (target?.closest?.('[data-phone]') as HTMLElement | null);
    const el = wa ?? phone;
    if (!el) return;

    const now = Date.now();
    if (el === lastEl && now - lastAt < 800) return;
    lastEl = el;
    lastAt = now;

    const event = wa ? 'whatsapp_click' : 'phone_click';
    const source = wa ? el.getAttribute('data-wa-source') || 'unknown' : 'tel';

    push({
      event,
      click_source: source,
      page: location.pathname,
      locale: document.documentElement.lang || 'es',
    });
  },
  true, // fase de captura: registra el clic aunque algo detenga la propagación
);
