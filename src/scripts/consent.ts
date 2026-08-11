/**
 * Runtime del banner de consentimiento (CLAUDE.pdf §7 — Fase 7).
 *
 * - Muestra la primera capa sólo si NO hay elección válida guardada y el tracking
 *   está activo (`data-consent-autoshow`, presente sólo con un GTM real).
 * - Aceptar / Rechazar / Guardar escriben un registro GRANULAR en localStorage
 *   ({v,ts,analytics,marketing}, caducidad 180 días) y llaman a
 *   gtag('consent','update',…) mapeando categorías → claves de Consent Mode v2.
 * - El <dialog> nativo aporta foco atrapado, Esc-para-cerrar (sin guardar) y
 *   backdrop. El botón "Gestionar cookies" del pie reabre estas preferencias.
 *
 * `window.gtag` lo define el bloque is:inline de `ConsentGtm.astro` en el <head>,
 * así que siempre existe antes de que corra este módulo (diferido).
 */
const STORAGE_KEY = 'kobor_consent';
const MAX_AGE = 1000 * 60 * 60 * 24 * 180; // 180 días

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

interface ConsentChoice {
  analytics: boolean;
  marketing: boolean;
}

const banner = document.querySelector<HTMLElement>('[data-consent-banner]');
const modal = document.querySelector<HTMLDialogElement>('#consent-settings');

/** Lee y valida el registro; borra y devuelve null si es inválido o ha caducado. */
function readChoice(): ConsentChoice | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as { v?: number; ts?: number; analytics?: string; marketing?: string };
    if (c && c.v === 1 && typeof c.ts === 'number' && Date.now() - c.ts < MAX_AGE) {
      return { analytics: c.analytics === 'granted', marketing: c.marketing === 'granted' };
    }
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* localStorage no disponible */
  }
  return null;
}

function saveChoice(choice: ConsentChoice): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        v: 1,
        ts: Date.now(),
        analytics: choice.analytics ? 'granted' : 'denied',
        marketing: choice.marketing ? 'granted' : 'denied',
      }),
    );
  } catch {
    /* modo privado / sin almacenamiento: la elección no persiste, defaults denegados */
  }
}

/** Traduce categorías → claves de Consent Mode v2 y actualiza el estado. */
function applyConsent(choice: ConsentChoice): void {
  const ads = choice.marketing ? 'granted' : 'denied';
  window.gtag?.('consent', 'update', {
    analytics_storage: choice.analytics ? 'granted' : 'denied',
    ad_storage: ads,
    ad_user_data: ads,
    ad_personalization: ads,
  });
}

function showBanner(): void {
  if (!banner) return;
  banner.hidden = false;
  document.body.setAttribute('data-consent-open', '');
  // Doble rAF: deja que se pinte primero el estado inicial (opacity:0 + translateY)
  // para que la transición de .consent__card se reproduzca de verdad. Con un solo
  // rAF el navegador funde ambos pasos en un recalc y el banner aparece de golpe.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => banner.classList.add('is-visible')),
  );
}

function hideBanner(): void {
  if (!banner || banner.hidden) return;
  banner.classList.remove('is-visible');
  document.body.removeAttribute('data-consent-open');
  window.setTimeout(() => {
    banner.hidden = true;
  }, 350);
}

function setSwitch(cat: string, on: boolean): void {
  const el = modal?.querySelector<HTMLInputElement>(`[data-consent-cat="${cat}"]`);
  if (el) el.checked = on;
}

function readSwitch(cat: string): boolean {
  return !!modal?.querySelector<HTMLInputElement>(`[data-consent-cat="${cat}"]`)?.checked;
}

function openModal(): void {
  if (!modal) return;
  const current = readChoice();
  setSwitch('analytics', current?.analytics ?? false);
  setSwitch('marketing', current?.marketing ?? false);
  // El <dialog> nativo (showModal) inertiza y oscurece el fondo, incluido el FAB,
  // así que no hace falta ocultarlo aparte como en la primera capa (no modal).
  if (typeof modal.showModal === 'function') {
    if (!modal.open) modal.showModal();
  } else {
    modal.setAttribute('open', '');
  }
}

function closeModal(): void {
  if (!modal) return;
  if (typeof modal.close === 'function') {
    if (modal.open) modal.close();
  } else {
    modal.removeAttribute('open');
  }
}

/** Persiste, aplica y cierra ambas capas. */
function choose(choice: ConsentChoice): void {
  saveChoice(choice);
  applyConsent(choice);
  closeModal();
  hideBanner();
}

// --- Delegación de clics para todas las acciones de consentimiento ---
document.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement)?.closest?.('[data-consent]') as HTMLElement | null;
  if (!btn) return;
  const action = btn.getAttribute('data-consent');
  switch (action) {
    case 'accept':
      choose({ analytics: true, marketing: true });
      break;
    case 'reject':
      choose({ analytics: false, marketing: false });
      break;
    case 'save':
      choose({ analytics: readSwitch('analytics'), marketing: readSwitch('marketing') });
      break;
    case 'settings':
    case 'reopen':
      openModal();
      break;
  }
});

// --- Auto-mostrar la primera capa: sólo sin elección previa y con tracking activo ---
if (banner && banner.hasAttribute('data-consent-autoshow') && !readChoice()) {
  showBanner();
}

export {};
