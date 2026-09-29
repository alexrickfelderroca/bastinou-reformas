/**
 * Cabeceras de caché y de tipo para kobor.es.
 *
 * Lo usan dos sitios, a propósito separados del middleware de redirecciones:
 *  - src/middleware.ts (respuestas SSR: /api/lead y lo que no sea un archivo)
 *  - src/server/header-policy.mjs, inyectado en dist/server/entry.mjs
 *    (TODAS las respuestas del proceso Node, incluidos los estáticos). El adaptador sirve public/ y el HTML prerenderizado con
 *    `send` ANTES del middleware, así que sin esa envoltura esas cabeceras
 *    no llegarían a /hero, /fonts ni al HTML.
 *
 * Las páginas HTML son iguales para todos los visitantes: el idioma va en la
 * ruta, el consentimiento y los formularios se resuelven en el cliente y no
 * hay sesión. Por eso el HTML se puede cachear en el CDN. /api y cualquier
 * método que no sea GET/HEAD no se cachean.
 */

export const CACHE_IMMUTABLE = 'public, max-age=31536000, immutable';
/** Imágenes y vídeo sin hash en el nombre: caché larga, pero no immutable. */
export const CACHE_LONG = 'public, max-age=2592000';
export const CACHE_HTML = 'public, max-age=0, s-maxage=300, stale-while-revalidate=600';
export const CACHE_NO_STORE = 'private, no-store';
export const CACHE_ERROR = 'public, max-age=0';

const LONG_ASSET =
  /\.(?:avif|webp|jpe?g|png|gif|svg|ico|mp4|webm)$/i;

/**
 * @param {string} pathname Ruta sin query (puede ir codificada).
 * @param {string} [method]
 * @param {number} [status]
 * @returns {string | null} Valor de Cache-Control, o null si no hay que tocarlo.
 */
export function cacheControlFor(pathname, method = 'GET', status = 200) {
  const path = stripQuery(pathname);
  const verb = String(method || 'GET').toUpperCase();

  if (path === '/api' || path.startsWith('/api/')) return CACHE_NO_STORE;
  if (verb !== 'GET' && verb !== 'HEAD') return CACHE_NO_STORE;

  if (path.startsWith('/_astro/')) return assetCache(status, CACHE_IMMUTABLE);
  if (path.startsWith('/fonts/') || path.endsWith('.woff2')) return assetCache(status, CACHE_IMMUTABLE);

  if (path.startsWith('/hero/') || LONG_ASSET.test(path)) return assetCache(status, CACHE_LONG);

  if (isHtmlPath(path)) {
    if (status === 200 || status === 304) return CACHE_HTML;
    return CACHE_ERROR;
  }

  return null;
}

/**
 * El servidor web de Hostinger sirve .webm y .avif como text/plain.
 * Forzamos el tipo en el origen, sólo cuando la respuesta es el archivo
 * (200/206/304): un 404 de /algo.webm es la página HTML de error.
 * @param {string} pathname
 * @param {number} [status]
 * @returns {string | null}
 */
export function contentTypeOverride(pathname, status = 200) {
  if (status !== 200 && status !== 206 && status !== 304) return null;
  const path = stripQuery(pathname).toLowerCase();
  if (path.endsWith('.webm')) return 'video/webm';
  if (path.endsWith('.mp4')) return 'video/mp4';
  if (path.endsWith('.avif')) return 'image/avif';
  return null;
}

/**
 * @param {string} pathname
 * @param {string} method
 * @param {Headers} headers
 * @param {number} [status]
 */
export function applyCacheHeaders(pathname, method, headers, status = 200) {
  const cache = cacheControlFor(pathname, method, status);
  const type = contentTypeOverride(pathname, status);
  if (cache) headers.set('Cache-Control', cache);
  if (type) headers.set('Content-Type', type);
}

/**
 * @param {string} pathname
 */
function stripQuery(pathname) {
  const raw = String(pathname || '/').split('?')[0] || '/';
  try {
    return decodeURI(raw);
  } catch {
    return raw;
  }
}

/** Un 404 de un asset no debe quedar un año en el CDN. */
function assetCache(status, value) {
  if (status === 200 || status === 206 || status === 304) return value;
  return CACHE_ERROR;
}

function isHtmlPath(path) {
  if (path.endsWith('.html')) return true;
  const last = path.split('/').pop() || '';
  return !last.includes('.');
}
