/**
 * Núcleo i18n (CLAUDE.pdf §4.1). Español principal (sin prefijo), catalán e
 * inglés. Nada de textos hardcodeados en componentes: todo pasa por los
 * diccionarios es/ca/en.json a través de `useTranslations`.
 */
import es from './es.json';
import ca from './ca.json';
import en from './en.json';
import { site } from '../config/site';

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

/** og:locale (formato Open Graph: idioma_TERRITORIO con guion bajo). */
export const localeOgLocale: Record<Locale, string> = {
  es: 'es_ES',
  ca: 'ca_ES',
  en: 'en_US',
};

type Dict = Record<string, unknown>;
const dictionaries: Record<Locale, Dict> = { es, ca, en };

/**
 * Datos de empresa que los textos legales interpolan con {clave}.
 *
 * Por qué existe esto: el aviso legal, la política de privacidad y la de
 * cookies tienen que nombrar a la titular (LSSI-CE art. 10, RGPD art. 13). Ese
 * dato estaba COPIADO a mano en los tres diccionarios, así que vivía en nueve
 * sitios y había que acordarse de los nueve.
 *
 * Y la trampa de verdad: el marcador estaba TRADUCIDO — [PENDIENTE] en es.json,
 * [PENDENT] en ca.json, [PENDING] en en.json. Así que la «búsqueda global de
 * PENDIENTE» que todo el mundo hace antes de publicar encontraba 7 de 21 y
 * dejaba el catalán y el inglés en la calle con el hueco puesto.
 *
 * Ahora el texto dice {legalName} y el valor sale de site.ts. Un cambio, nueve
 * páginas. Un idioma nuevo hereda los datos sin tocar nada.
 */
/**
 * Texto del hueco MIENTRAS NO HAYA DATO, en el idioma de cada página.
 *
 * Hace falta porque site.ts es un solo archivo y no tiene idioma. Sin esto, una
 * página en catalán mostraría «[PENDIENTE: razón social]» en español: el
 * refactor habría arreglado el mantenimiento y empeorado lo que se ve. En
 * cuanto los tres campos de site.ts tengan valor real, esta tabla deja de
 * usarse sola — no hay que tocarla ni borrarla.
 */
const HUECO_POR_IDIOMA: Record<Locale, Record<string, string>> = {
  es: { legalName: '[PENDIENTE: razón social]', nif: '[PENDIENTE]', legalAddress: '[PENDIENTE: dirección]' },
  ca: { legalName: '[PENDENT: raó social]', nif: '[PENDENT]', legalAddress: '[PENDENT: adreça]' },
  en: { legalName: '[PENDING: legal name]', nif: '[PENDING]', legalAddress: '[PENDING: address]' },
};

/** Un valor sigue pendiente si conserva el marcador que trae site.ts de fábrica. */
const siguePendiente = (v: string) => v.startsWith('[PENDIENTE');

function companyVarsFor(locale: Locale): Record<string, string> {
  const hueco = HUECO_POR_IDIOMA[locale];
  const dato = (clave: string, valor: string) => (siguePendiente(valor) ? hueco[clave] : valor);
  return {
    legalName: dato('legalName', site.legalName),
    nif: dato('nif', site.nif),
    legalAddress: dato('legalAddress', site.legalAddress),
    email: site.email,
    phone: site.phone,
    city: site.address.city,
  };
}

/**
 * Sustituye {clave} por su valor. Una clave sin valor se deja TAL CUAL, con sus
 * llaves: si alguien escribe {nifX} por error, se ve en la página. Borrarla
 * dejaría una frase que se lee bien y que ya no identifica a nadie, que es
 * justo el fallo que no se detecta leyendo.
 */
function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (entero, clave) =>
    Object.prototype.hasOwnProperty.call(vars, clave) ? vars[clave] : entero,
  );
}

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
  const vars = companyVarsFor(locale);
  return function t(key: string): string {
    const val = lookup(dictionaries[locale], key) ?? lookup(dictionaries.es, key);
    return typeof val === 'string' ? interpolate(val, vars) : key;
  };
}

/** Sustituye {clave} en cualquier cadena del árbol, respetando su forma. */
function interpolateDeep<T>(node: T, vars: Record<string, string>): T {
  if (typeof node === 'string') return interpolate(node, vars) as unknown as T;
  if (Array.isArray(node)) return node.map((n) => interpolateDeep(n, vars)) as unknown as T;
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) out[k] = interpolateDeep(v, vars);
    return out as unknown as T;
  }
  return node;
}

/**
 * Igual que `t` pero para nodos que son arrays/objetos (listas, FAQs…).
 *
 * Interpola en profundidad, y no por simetría: las secciones legales llegan por
 * aquí (`legal.s`, `privacy.s` son arrays de {h, p[]}), así que 18 de los 21
 * marcadores están DENTRO de estos arrays. Interpolar sólo en `t()` habría
 * arreglado las tres cookies y dejado el aviso legal y la privacidad intactos
 * en los tres idiomas — con el refactor puesto y pareciendo hecho.
 */
export function tData<T = unknown>(locale: Locale, key: string): T | undefined {
  const val = lookup(dictionaries[locale], key) ?? lookup(dictionaries.es, key);
  return val === undefined ? undefined : interpolateDeep(val as T, companyVarsFor(locale));
}
