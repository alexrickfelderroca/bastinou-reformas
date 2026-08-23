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
import { clarityEnabled } from '../config/site';

const STORAGE_KEY = 'kobor_consent';
const MAX_AGE = 1000 * 60 * 60 * 24 * 180; // 180 días

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    /** Definido por ConsentClarity.astro (sólo se renderiza con un ID real). */
    __koborClarity?: { cargar: () => void };
    /** Definido por el tag de Microsoft Clarity una vez inyectado. */
    clarity?: (...args: unknown[]) => void;
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

  // Microsoft Clarity NO entiende Consent Mode, así que se gatea aparte
  // (categoría analítica). El gate de carga vive en ConsentClarity.astro.
  // El guard tiene que ser EL MISMO que decide el render del componente
  // (`clarityEnabled`, site.ts): gatear con `import.meta.env.PUBLIC_CLARITY_ID`
  // crudo divergía en cuanto site.ts lleva el ID real como default — sin la
  // env en el build, Vite eliminaba este bloque mientras el componente SÍ se
  // renderizaba: el clic en vivo no cargaba Clarity y, peor, una revocación en
  // la misma página no le retiraba el consentimiento ni borraba sus cookies
  // (cazado verificando producción el 23-08).
  if (clarityEnabled) {
    if (choice.analytics) {
      // granted → inyectar el tag (idempotente; sólo existe con un ID real).
      window.__koborClarity?.cargar();
      // Y si Clarity YA estaba cargado (conceder → revocar → volver a
      // conceder en la misma página), cargar() es no-op: hay que devolverle
      // el consentimiento explícitamente o queda mudo hasta la siguiente
      // carga (flujo reproducido en la revisión del 23-08).
      window.clarity?.('consent');
    } else {
      // denied: un script ya inyectado no se descarga solo, así que si Clarity
      // está cargado se le retira el consentimiento (deja de grabar y de
      // escribir cookies)…
      window.clarity?.('consent', false);
      // …y se borran sus cookies (_clck y _clsk) en el host actual y en
      // .kobor.es, cubriendo también restos de una visita anterior.
      const past = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
      for (const name of ['_clck', '_clsk']) {
        document.cookie = `${name}=; ${past}; path=/`;
        document.cookie = `${name}=; ${past}; path=/; domain=.kobor.es`;
        document.cookie = `${name}=; ${past}; path=/; domain=${location.hostname}`;
      }
    }
  }
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
