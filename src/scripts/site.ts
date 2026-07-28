/**
 * Runtime del sitio (CLAUDE.pdf §3.3): scroll suave con Lenis + sistema de
 * animaciones (reveal, reveal por líneas, parallax, count-up) y estado
 * glassmorphism del header. Animamos sólo transform y opacity; nada bloquea el
 * LCP ni la interacción. Con prefers-reduced-motion se desactiva todo lo no
 * esencial y se muestran los valores finales.
 */
import Lenis from 'lenis';

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Ejecuta `fn` cuando el hilo principal está libre (tras el primer render). */
function whenIdle(fn: () => void): void {
  const ric = (window as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
  }).requestIdleCallback;
  if (ric) ric(fn, { timeout: 800 });
  else window.setTimeout(fn, 200);
}

/* -------------------------------------------------------------------------- */
/* Lenis — scroll suave (mejora NO crítica; se difiere a idle)                 */
/* Al iniciarse mide el wrapper (reflow forzado) y competiría con el LCP. Se   */
/* inicializa en idle (ver final del archivo); hasta entonces el header y el   */
/* parallax usan el scroll nativo, y los anclas caen a scroll nativo. Lenis    */
/* scrollea de forma nativa con suavizado, así que los eventos 'scroll' de     */
/* window se siguen disparando y todo queda sincronizado.                      */
/* -------------------------------------------------------------------------- */
let lenis: Lenis | null = null;

// Enlaces ancla internos → scroll suave con Lenis si ya está listo; si no, nativo.
document.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
  if (!a) return;
  const id = a.getAttribute('href');
  if (!id || id === '#') return;
  const target = document.querySelector(id);
  if (target && lenis) {
    e.preventDefault();
    lenis.scrollTo(target as HTMLElement, { offset: -80 });
  }
});

/* -------------------------------------------------------------------------- */
/* Header: estado "scrolled" para el glassmorphism                             */
/* -------------------------------------------------------------------------- */
const header = document.querySelector<HTMLElement>('[data-site-header]');
const syncHeader = () => {
  if (header) header.dataset.scrolled = window.scrollY > 24 ? 'true' : 'false';
};
syncHeader();
window.addEventListener('scroll', syncHeader, { passive: true });

/* -------------------------------------------------------------------------- */
/* Auto-stagger: reparte retardos dentro de grupos y titulares por líneas      */
/* -------------------------------------------------------------------------- */
document.querySelectorAll<HTMLElement>('[data-reveal-group]').forEach((group) => {
  const step = Number(group.getAttribute('data-reveal-stagger') || 80);
  group.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el, i) => {
    if (!el.style.getPropertyValue('--reveal-delay')) {
      el.style.setProperty('--reveal-delay', `${i * step}ms`);
    }
  });
});
document.querySelectorAll<HTMLElement>('[data-reveal-lines]').forEach((title) => {
  title.querySelectorAll<HTMLElement>('.line > span').forEach((span, i) => {
    span.style.setProperty('--line-delay', `${i * 90}ms`);
  });
});

/* -------------------------------------------------------------------------- */
/* IntersectionObserver: reveal, reveal por líneas y disparo de count-up       */
/* -------------------------------------------------------------------------- */
const io = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target as HTMLElement;
      el.classList.add('is-visible');
      if (el.hasAttribute('data-countup')) runCountUp(el);
      io.unobserve(el);
    }
  },
  { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
);

document
  .querySelectorAll('[data-reveal], [data-reveal-lines], [data-countup]')
  .forEach((el) => io.observe(el));

// Teclado: si el foco entra en un elemento aún oculto por el reveal (p. ej.
// tabulando por el grid del portfolio con su stagger), se muestra al instante
// para que el usuario nunca tenga el foco dentro de contenido invisible.
document.addEventListener('focusin', (e) => {
  const el = (e.target as HTMLElement).closest?.('[data-reveal]:not(.is-visible)') as HTMLElement | null;
  if (!el) return;
  el.style.setProperty('--reveal-delay', '0ms');
  el.classList.add('is-visible');
  io.unobserve(el);
});

/* -------------------------------------------------------------------------- */
/* Count-up: la cifra "corre" al entrar en viewport, una sola vez (§3.3)       */
/* -------------------------------------------------------------------------- */
function runCountUp(el: HTMLElement): void {
  const target = Number(el.getAttribute('data-countup') || '0');
  const suffix = el.getAttribute('data-countup-suffix') || '';
  const prefix = el.getAttribute('data-countup-prefix') || '';
  const locale = document.documentElement.lang || 'es';
  const fmt = new Intl.NumberFormat(locale);
  if (prefersReduced) {
    el.textContent = `${prefix}${fmt.format(target)}${suffix}`;
    return;
  }
  const duration = 1200;
  const start = performance.now();
  const tick = (now: number) => {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
    el.textContent = `${prefix}${fmt.format(Math.round(target * eased))}${suffix}`;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* -------------------------------------------------------------------------- */
/* Parallax sutil: desplazamiento máx. ~8% del alto del elemento (§3.3)        */
/* -------------------------------------------------------------------------- */
function initParallax(): void {
  const parallaxEls = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
  if (!parallaxEls.length) return;
  let ticking = false;
  const update = () => {
    const vh = window.innerHeight;
    for (const el of parallaxEls) {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > vh) continue;
      const amount = Number(el.getAttribute('data-parallax') || '0.08') || 0.08;
      const max = rect.height * amount;
      // -1 (elemento arriba) .. 1 (elemento abajo)
      const progress = (rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2);
      el.style.transform = `translate3d(0, ${(-progress * max).toFixed(2)}px, 0)`;
    }
    ticking = false;
  };
  const request = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  update();
}

function initLenis(): void {
  lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.6,
  });
  const raf = (time: number) => {
    lenis!.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}

/* -------------------------------------------------------------------------- */
/* Inicialización diferida (idle): Lenis + parallax. Corren tras el primer     */
/* render, con el layout ya estable, así que las lecturas de geometría del     */
/* parallax no fuerzan un reflow síncrono y no cargan el TBT de la carga.      */
/* -------------------------------------------------------------------------- */
if (!prefersReduced) {
  whenIdle(() => {
    initLenis();
    initParallax();
  });
}

export {};
