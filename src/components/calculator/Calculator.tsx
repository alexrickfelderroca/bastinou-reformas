/**
 * Calculadora de reformas (CLAUDE.pdf §5). Wizard de 5 pasos + resultado, island
 * de React. Motor en lib/estimate.ts + pricing.json. Muestra una horquilla (±15%)
 * con count-up, captura el lead SIN pedir teléfono antes, ofrece WhatsApp
 * prellenado y persiste el estado en sessionStorage. Empuja eventos calc_* al
 * dataLayer (§5.4). Textos por props (i18n desde Astro).
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  estimate,
  partes,
  type Obra,
  type Parte,
  type Segmento,
  type Tipo,
} from '../../lib/estimate';

type Msg = Record<string, string>;
interface Props {
  locale: string;
  messages: Msg;
  whatsapp: string;
  privacyHref: string;
}

interface Answers {
  tipo: Tipo | null;
  obra: Obra | null;
  parts: Parte[];
  m2: number;
  segmento: Segmento | null;
  municipio: string;
  plazo: string;
}

const STORAGE_KEY = 'bastinou-calc-v1';
const M2_MIN = 20;
const M2_MAX = 500;
const TOTAL_STEPS = 5;

const emptyAnswers: Answers = {
  tipo: null,
  obra: null,
  parts: [],
  m2: 80,
  segmento: null,
  municipio: '',
  plazo: '',
};

function pushDL(event: string, data: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { dataLayer?: Record<string, unknown>[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ event, ...data });
}

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Calculator({ locale, messages, whatsapp, privacyHref }: Props) {
  const t = (k: string) => messages[k] ?? k;
  const nf = new Intl.NumberFormat(locale === 'en' ? 'en' : 'es-ES');

  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>(emptyAnswers);
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const completeFired = useRef(false);

  // --- Persistencia de sesión ---
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { step: number; a: Answers };
        if (saved.a) setA({ ...emptyAnswers, ...saved.a });
        if (typeof saved.step === 'number') setStep(saved.step);
      }
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step, a }));
    } catch {
      /* ignore */
    }
  }, [step, a]);

  const result = estimate({
    tipo: a.tipo ?? 'piso',
    obra: a.obra ?? 'integral',
    parts: a.parts,
    m2: a.m2,
    segmento: a.segmento ?? 'estandar',
  });

  const update = (patch: Partial<Answers>) => setA((prev) => ({ ...prev, ...patch }));

  const stepValid = (): boolean => {
    switch (step) {
      case 0:
        return a.tipo !== null;
      case 1:
        return a.obra === 'integral' || (a.obra === 'parcial' && a.parts.length > 0);
      case 2:
        return a.m2 >= M2_MIN && a.m2 <= M2_MAX;
      case 3:
        return a.segmento !== null;
      case 4:
        return true;
      default:
        return true;
    }
  };

  const goTo = (n: number) => {
    setError(null);
    setStep(n);
    if (n < TOTAL_STEPS) pushDL('calc_step', { step: n + 1 });
    if (typeof document !== 'undefined') {
      document.getElementById('calc-top')?.scrollIntoView({ behavior: prefersReduced() ? 'auto' : 'smooth', block: 'start' });
    }
  };

  const next = () => {
    if (!stepValid()) {
      if (step === 1) setError(t('emptyParts'));
      return;
    }
    if (!started) {
      setStarted(true);
      pushDL('calc_start');
    }
    goTo(Math.min(step + 1, TOTAL_STEPS));
  };
  const back = () => goTo(Math.max(step - 1, 0));

  const selectTipo = (tipo: Tipo) => {
    update({ tipo });
    if (!started) {
      setStarted(true);
      pushDL('calc_start');
    }
    goTo(1);
  };
  const selectSegmento = (segmento: Segmento) => {
    update({ segmento });
    goTo(4);
  };
  const togglePart = (part: Parte) => {
    setError(null);
    setA((prev) => ({
      ...prev,
      parts: prev.parts.includes(part)
        ? prev.parts.filter((p) => p !== part)
        : [...prev.parts, part],
    }));
  };

  const restart = () => {
    setA(emptyAnswers);
    setStarted(false);
    setSubmitted(false);
    completeFired.current = false;
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    goTo(0);
  };

  // --- calc_complete al llegar al resultado ---
  useEffect(() => {
    if (step === TOTAL_STEPS && result.valid && !completeFired.current) {
      completeFired.current = true;
      pushDL('calc_complete', {
        tipo: a.tipo,
        obra: a.obra,
        m2: a.m2,
        segmento: a.segmento,
        precio_min: result.min,
        precio_max: result.max,
      });
    }
    if (step !== TOTAL_STEPS) completeFired.current = false;
  }, [step, result.valid]);

  // --- Count-up del resultado ---
  const [display, setDisplay] = useState({ min: 0, max: 0 });
  useEffect(() => {
    if (step !== TOTAL_STEPS || !result.valid) return;
    if (prefersReduced()) {
      setDisplay({ min: result.min, max: result.max });
      return;
    }
    const dur = 800;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay({ min: Math.round(result.min * e), max: Math.round(result.max * e) });
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step, result.min, result.max]);

  // --- WhatsApp prellenado ---
  const waMessage = () => {
    const tipoName = { piso: t('tipoPiso'), casa: t('tipoCasa'), oficina: t('tipoOficina'), otro: t('tipoOtro') }[a.tipo ?? 'piso'];
    const obraName = a.obra === 'parcial' ? t('obraNameParcial') : t('obraNameIntegral');
    const segName = { basico: t('segBasicoName'), estandar: t('segEstandarName'), premium: t('segPremiumName') }[a.segmento ?? 'estandar'];
    return t('waTemplate')
      .replace('{obra}', obraName.toLowerCase())
      .replace('{tipo}', (tipoName ?? '').toLowerCase())
      .replace('{m2}', String(a.m2))
      .replace('{segmento}', segName ?? '')
      .replace('{min}', nf.format(result.min))
      .replace('{max}', nf.format(result.max));
  };
  const waHref = `https://wa.me/${whatsapp}?text=${encodeURIComponent(waMessage())}`;

  const onLeadSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    // El envío real (endpoint + email + UTM) se conecta en Fase 6.
    pushDL('calc_lead_submit', {
      tipo: a.tipo,
      obra: a.obra,
      m2: a.m2,
      segmento: a.segmento,
      precio_min: result.min,
      precio_max: result.max,
      plazo: a.plazo,
    });
    setSubmitted(true);
  };

  /* ---------------------------------------------------------------- render */
  const cardBase =
    'text-left rounded-2xl border p-5 transition-all duration-200 cursor-pointer';
  const cardOff = 'bg-paper border-line hover:border-ink';
  const cardOn = 'bg-ink text-paper border-ink';

  return (
    <div id="calc-top" className="mx-auto max-w-3xl">
      {/* Barra de progreso */}
      {step < TOTAL_STEPS && (
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-sm text-slate">
            <span>{t('stepOf').replace('{n}', String(step + 1)).replace('{total}', String(TOTAL_STEPS))}</span>
            <span>{Math.round(((step + 1) / TOTAL_STEPS) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-cloud">
            <div
              className="h-full rounded-full bg-ink transition-all duration-500"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Paso 1 — tipo */}
      {step === 0 && (
        <fieldset>
          <legend className="h-section mb-6 block">{t('s1title')}</legend>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {(['piso', 'casa', 'oficina', 'otro'] as Tipo[]).map((tp) => (
              <button
                key={tp}
                type="button"
                onClick={() => selectTipo(tp)}
                className={`${cardBase} ${a.tipo === tp ? cardOn : cardOff} flex flex-col gap-3`}
                aria-pressed={a.tipo === tp}
              >
                <TipoIcon tipo={tp} />
                <span className="text-lg font-semibold">
                  {t(`tipo${tp[0].toUpperCase()}${tp.slice(1)}`)}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {/* Paso 2 — obra */}
      {step === 1 && (
        <fieldset>
          <legend className="h-section mb-6 block">{t('s2title')}</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(['integral', 'parcial'] as Obra[]).map((ob) => (
              <button
                key={ob}
                type="button"
                onClick={() => update({ obra: ob, parts: ob === 'integral' ? [] : a.parts })}
                className={`${cardBase} ${a.obra === ob ? cardOn : cardOff}`}
                aria-pressed={a.obra === ob}
              >
                <span className="block text-lg font-semibold">
                  {ob === 'integral' ? t('obraIntegral') : t('obraParcial')}
                </span>
                <span className={`mt-1 block text-sm ${a.obra === ob ? 'text-mist' : 'text-slate'}`}>
                  {ob === 'integral' ? t('obraIntegralDesc') : t('obraParcialDesc')}
                </span>
              </button>
            ))}
          </div>

          {a.obra === 'parcial' && (
            <div className="mt-6">
              <p className="mb-1 font-medium">{t('s2parcialTitle')}</p>
              <p className="mb-3 text-sm text-slate">{t('s2parcialHint')}</p>
              <div className="flex flex-wrap gap-2">
                {partes.map((part) => {
                  const on = a.parts.includes(part);
                  return (
                    <button
                      key={part}
                      type="button"
                      onClick={() => togglePart(part)}
                      aria-pressed={on}
                      className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                        on ? 'border-ink bg-ink text-paper' : 'border-line bg-paper hover:border-ink'
                      }`}
                    >
                      {t(`parte${part[0].toUpperCase()}${part.slice(1)}`)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </fieldset>
      )}

      {/* Paso 3 — m2 */}
      {step === 2 && (
        <fieldset>
          <legend className="h-section mb-2 block">{t('s3title')}</legend>
          <p className="mb-6 text-slate">{t('s3hint')}</p>
          <div className="rounded-2xl border border-line bg-cloud p-6">
            <div className="mb-4 flex items-end justify-between">
              <div className="flex items-baseline gap-2">
                <input
                  type="number"
                  min={M2_MIN}
                  max={M2_MAX}
                  value={a.m2}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    update({ m2: Number.isNaN(v) ? M2_MIN : Math.min(M2_MAX, Math.max(M2_MIN, v)) });
                  }}
                  className="w-28 border-0 border-b border-ink bg-transparent text-4xl font-semibold tracking-tight focus:outline-none"
                  aria-label={t('s3title')}
                />
                <span className="text-xl text-slate">{t('unit')}</span>
              </div>
            </div>
            <input
              type="range"
              min={M2_MIN}
              max={M2_MAX}
              step={5}
              value={a.m2}
              onChange={(e) => update({ m2: Number(e.target.value) })}
              className="w-full accent-ink"
              aria-label={t('s3title')}
            />
            <div className="mt-1 flex justify-between text-xs text-mist">
              <span>{M2_MIN} {t('unit')}</span>
              <span>{M2_MAX} {t('unit')}</span>
            </div>
          </div>
        </fieldset>
      )}

      {/* Paso 4 — segmento */}
      {step === 3 && (
        <fieldset>
          <legend className="h-section mb-6 block">{t('s4title')}</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(['basico', 'estandar', 'premium'] as Segmento[]).map((sg) => {
              const cap = sg[0].toUpperCase() + sg.slice(1);
              return (
                <button
                  key={sg}
                  type="button"
                  onClick={() => selectSegmento(sg)}
                  className={`${cardBase} ${a.segmento === sg ? cardOn : cardOff} flex flex-col gap-2`}
                  aria-pressed={a.segmento === sg}
                >
                  <span className="text-lg font-semibold">{t(`seg${cap}Name`)}</span>
                  <span className={`text-sm ${a.segmento === sg ? 'text-mist' : 'text-slate'}`}>
                    {t(`seg${cap}Desc`)}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* Paso 5 — opcional */}
      {step === 4 && (
        <fieldset>
          <legend className="h-section mb-2 block">{t('s5title')}</legend>
          <p className="mb-6 text-slate">{t('s5hint')}</p>
          <div className="grid gap-5">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium">{t('municipio')}</span>
              <input
                type="text"
                value={a.municipio}
                onChange={(e) => update({ municipio: e.target.value })}
                className="rounded-lg border border-line bg-paper px-3.5 py-2.5 focus:border-ink focus:outline-none"
              />
            </label>
            <div>
              <span className="mb-2 block text-sm font-medium">{t('start')}</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { k: 'ya', label: t('startYa') },
                  { k: '1-3', label: t('start13') },
                  { k: '+3', label: t('start3') },
                ].map((o) => (
                  <button
                    key={o.k}
                    type="button"
                    onClick={() => update({ plazo: o.k })}
                    aria-pressed={a.plazo === o.k}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                      a.plazo === o.k ? 'border-ink bg-ink text-paper' : 'border-line bg-paper hover:border-ink'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </fieldset>
      )}

      {/* Resultado */}
      {step === TOTAL_STEPS && (
        <div>
          <div className="rounded-3xl bg-ink p-7 text-paper sm:p-9">
            <span className="text-xs uppercase tracking-widest text-mist">{t('resultTitle')}</span>
            <p className="mt-3 text-sm text-mist">{t('resultRange')}</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">
              {nf.format(display.min)} €
              <span className="mx-2 text-mist">{t('resultAnd')}</span>
              {nf.format(display.max)} €
            </p>
            {result.perSqm > 0 && a.obra === 'integral' && (
              <p className="mt-3 text-mist">
                {nf.format(result.perSqm)} €/{t('unit')} · {t('resultPerSqm')}
              </p>
            )}
            <p className="mt-5 max-w-prose text-xs leading-relaxed text-mist">{t('resultDisclaimer')}</p>
          </div>

          {/* Captura de lead (sin bloquear el resultado) */}
          {!submitted ? (
            <div className="mt-4 grid gap-4 rounded-3xl border border-line bg-cloud p-6 sm:p-8">
              <div>
                <h3 className="text-xl font-semibold tracking-tight">{t('leadTitle')}</h3>
                <p className="mt-1 text-slate">{t('leadSubtitle')}</p>
              </div>
              <form className="grid gap-4" onSubmit={onLeadSubmit} noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className="text-sm font-medium">{t('leadName')}</span>
                    <input name="name" type="text" required autoComplete="name" className="rounded-lg border border-line bg-paper px-3.5 py-2.5 focus:border-ink focus:outline-none" />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-sm font-medium">{t('leadPhone')}</span>
                    <input name="phone" type="tel" required autoComplete="tel" inputMode="tel" className="rounded-lg border border-line bg-paper px-3.5 py-2.5 focus:border-ink focus:outline-none" />
                  </label>
                </div>
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium">{t('leadEmail')}</span>
                  <input name="email" type="email" autoComplete="email" className="rounded-lg border border-line bg-paper px-3.5 py-2.5 focus:border-ink focus:outline-none" />
                </label>
                <label className="flex items-start gap-2 text-sm text-slate">
                  <input type="checkbox" required className="mt-0.5 h-4 w-4 accent-ink" />
                  <span>
                    {t('leadPrivacy')}{' '}
                    <a href={privacyHref} target="_blank" rel="noopener" className="underline">
                      {t('leadPrivacyLink')}
                    </a>.
                  </span>
                </label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button type="submit" className="btn">{t('leadSubmit')}</button>
                  <span className="text-sm text-slate">{t('orWhatsapp')}</span>
                  <a href={waHref} target="_blank" rel="noopener" onClick={() => pushDL('calc_whatsapp_click')} className="btn btn-whatsapp">
                    WhatsApp
                  </a>
                </div>
              </form>
            </div>
          ) : (
            <div className="mt-4 rounded-3xl border border-line bg-cloud p-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ink text-paper">
                <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M5 11.5l4 4L17 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <h3 className="text-xl font-semibold">{t('thanksTitle')}</h3>
              <p className="mx-auto mt-2 max-w-md text-slate">{t('thanksText')}</p>
            </div>
          )}

          <div className="mt-5 text-center">
            <button type="button" onClick={restart} className="text-sm text-slate underline underline-offset-2 hover:text-ink">
              {t('restart')}
            </button>
          </div>
        </div>
      )}

      {/* Navegación */}
      {step < TOTAL_STEPS && (
        <div className="mt-8 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className="btn btn-outline disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('back')}
          </button>
          <div className="flex items-center gap-3">
            {step === 4 && (
              <button type="button" onClick={next} className="text-sm text-slate underline underline-offset-2 hover:text-ink">
                {t('skip')}
              </button>
            )}
            <button
              type="button"
              onClick={next}
              disabled={!stepValid()}
              className="btn disabled:cursor-not-allowed disabled:opacity-40"
            >
              {step === 4 ? t('seeResult') : t('next')}
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function TipoIcon({ tipo }: { tipo: Tipo }) {
  const common = { width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (tipo === 'piso') return (<svg {...common}><path d="M3 21h18M6 21V7l6-4 6 4v14M10 21v-5h4v5" /></svg>);
  if (tipo === 'casa') return (<svg {...common}><path d="M4 21V9l8-6 8 6v12M4 21h16M9 21v-6h6v6" /></svg>);
  if (tipo === 'oficina') return (<svg {...common}><path d="M4 21V4h11v17M15 21h5V9h-5M8 8h3M8 12h3M8 16h3" /></svg>);
  return (<svg {...common}><path d="M12 3l9 6-9 6-9-6 9-6zM3 15l9 6 9-6" /></svg>);
}
