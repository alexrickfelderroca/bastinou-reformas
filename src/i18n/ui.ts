/**
 * Núcleo i18n (CLAUDE.pdf §4.1). Español principal (sin prefijo), catalán e
 * inglés. Nada de textos hardcodeados en componentes: todo pasa por los
 * diccionarios es/ca/en.json a través de `useTranslations`.
 */
import es from './es.json';
import ca from './ca.json';
import en from './en.json';

export const locales = ['es', 'ca', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'es';

/** Nombre nativo del idioma (para el selector). */
export const localeNames: Record<Locale, string> = {
  es: 'Español',
  ca: 'Català',
  en: 'English',
};

/** Código corto para el toggle del header. */
export const localeShort: Record<Locale, string> = { es: 'ES', ca: 'CA', en: 'EN' };

/** Valor del atributo lang / hreflang. x-default → es. */
export const localeHtmlLang: Record<Locale, string> = {
  es: 'es-ES',
  ca: 'ca-ES',
  en: 'en',
};

type Dict = Record<string, unknown>;
const dictionaries: Record<Locale, Dict> = { es, ca, en };

/** Deduce el idioma a partir de la URL: /ca/… → ca, /en/… → en, resto → es. */
export function getLocaleFromUrl(url: URL): Locale {
  const [, seg] = url.pathname.split('/');
  if (seg === 'ca' || seg === 'en') return seg;
  return 'es';
}

function lookup(dict: Dict, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Dict)) {
      return (acc as Dict)[part];
    }
    return undefined;
  }, dict);
}

/**
 * Devuelve la función de traducción para un idioma. Busca por clave con notación
 * de punto ("nav.home"). Si falta en el idioma, cae al español y, en último
 * término, devuelve la propia clave (visible en desarrollo para detectar huecos).
 */
export function useTranslations(locale: Locale) {
  return function t(key: string): string {
    const val = lookup(dictionaries[locale], key) ?? lookup(dictionaries.es, key);
    return typeof val === 'string' ? val : key;
  };
}

/** Igual que `t` pero para nodos que son arrays/objetos (listas, FAQs…). */
export function tData<T = unknown>(locale: Locale, key: string): T | undefined {
  return (lookup(dictionaries[locale], key) ?? lookup(dictionaries.es, key)) as T | undefined;
}
