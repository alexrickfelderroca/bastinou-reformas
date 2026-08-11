/**
 * Formularios y atribución (CLAUDE.pdf §6, §7). Captura UTM/gclid al aterrizar y
 * los guarda en sessionStorage para adjuntarlos a cada lead. Mejora los
 * formularios [data-lead-form]: envío por fetch a /api/lead, estados de
 * carga/gracias/error y evento form_submit al dataLayer.
 */
const UTM_KEY = 'kobor-utm';
const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'];

function captureUTM(): void {
  const params = new URLSearchParams(location.search);
  const found: Record<string, string> = {};
  for (const k of UTM_FIELDS) {
    const v = params.get(k);
    if (v) found[k] = v;
  }
  if (Object.keys(found).length) {
    try {
      sessionStorage.setItem(UTM_KEY, JSON.stringify(found));
    } catch {
      /* ignore */
    }
  }
}

export function getUTM(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(UTM_KEY) || '{}');
  } catch {
    return {};
  }
}

function dl(event: string, data: Record<string, unknown> = {}): void {
  const w = window as unknown as { dataLayer?: Record<string, unknown>[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ event, ...data });
}

captureUTM();

document.querySelectorAll<HTMLFormElement>('[data-lead-form]').forEach((form) => {
  const thanks = form.parentElement?.querySelector<HTMLElement>('[data-form-thanks]');
  const errorEl = form.parentElement?.querySelector<HTMLElement>('[data-form-error]');
  const submit = form.querySelector<HTMLButtonElement>('[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const payload: Record<string, string> = Object.fromEntries(
      new FormData(form).entries() as unknown as Iterable<[string, string]>,
    );
    Object.assign(payload, getUTM(), { page: location.pathname });

    const prev = submit?.textContent ?? '';
    if (submit) {
      submit.disabled = true;
      submit.dataset.loading = 'true';
    }
    if (errorEl) errorEl.hidden = true;

    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const out = (await res.json().catch(() => ({ ok: res.ok }))) as { ok?: boolean };
      if (res.ok && out.ok) {
        dl('form_submit', {
          form_id: form.getAttribute('id') || 'lead',
          page: location.pathname,
          service: payload.service || '',
        });
        // Evento de conversión estándar (especificación «Nuestros precios» §9).
        dl('generate_lead', {
          form_id: form.getAttribute('id') || 'lead',
          page: location.pathname,
          service: payload.service || '',
        });
        form.hidden = true;
        if (thanks) thanks.hidden = false;
        return;
      }
      throw new Error('bad_response');
    } catch {
      if (errorEl) errorEl.hidden = false;
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = prev;
        delete submit.dataset.loading;
      }
    }
  });
});
