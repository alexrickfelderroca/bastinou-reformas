/**
 * Destino canónico de una petición (host, barra final, index.html y URLs
 * antiguas) calculado de una sola vez. Lo usan el middleware y el gate que
 * corre delante del servidor de estáticos de @astrojs/node: si fueran dos
 * saltos, www + sin barra encadenarían 301.
 *
 * El host se lee de X-Forwarded-Host y de Host. Detrás del proxy de Hostinger
 * el Host que ve Node puede ser el interno; el original viaja en
 * X-Forwarded-Host. Si cualquiera de los dos es www.kobor.es, el destino es
 * https://kobor.es.
 */

export const CANONICAL_ORIGIN = 'https://kobor.es';
export const HSTS_VALUE = 'max-age=31536000';

/** URLs del rebranding (jul-2026), ya con barra, hacia su destino actual. */
export const LEGACY_REDIRECTS: Record<string, string> = {
  '/reformas-pisos-barcelona/': '/reformas-viviendas-barcelona/',
  '/reformas-casas-barcelona/': '/reformas-viviendas-barcelona/',
  '/construccion-barcelona/': '/',
  '/calculadora-reformas/': '/nuestros-precios/',
  '/proyectos/casa-espana/': '/proyectos/',
  '/ca/reformes-pisos-barcelona/': '/ca/reformes-habitatges-barcelona/',
  '/ca/reformes-cases-barcelona/': '/ca/reformes-habitatges-barcelona/',
  '/ca/construccio-barcelona/': '/ca/',
  '/ca/calculadora-reformes/': '/ca/els-nostres-preus/',
  '/en/apartment-renovation-barcelona/': '/en/home-renovation-barcelona/',
  '/en/house-renovation-barcelona/': '/en/home-renovation-barcelona/',
  '/en/construction-barcelona/': '/en/',
  '/en/renovation-cost-calculator/': '/en/our-prices/',
};

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export interface CanonicalInput {
  pathname: string;
  search: string;
  host: string | null;
  forwardedHost: string | null;
  forwardedProto: string | null;
  /** Socket TLS (el proceso Node termina HTTPS). */
  encrypted: boolean;
  /** Origen de la petición, sólo se conserva en localhost. */
  requestOrigin: string;
}

export interface CanonicalDecision {
  /** URL absoluta del 301, o null si la petición ya es canónica. */
  location: string | null;
  /** La respuesta que ve el cliente es HTTPS: hay que enviar HSTS. */
  https: boolean;
}

/** Parte un header (posiblemente repetido o con comas) en hostnames sin puerto. */
export function hostnamesFrom(header: string | null | undefined): string[] {
  if (!header) return [];
  const names: string[] = [];
  for (const part of header.split(',')) {
    let host = part.trim().toLowerCase();
    if (!host) continue;
    if (host.startsWith('[')) {
      const end = host.indexOf(']');
      host = end >= 0 ? host.slice(1, end) : host;
    } else {
      host = host.replace(/:\d+$/, '');
    }
    if (host) names.push(host);
  }
  return names;
}

/**
 * Ruta canónica: index.html → carpeta, barra final en páginas (no en ficheros
 * ni en /api/), y sustitución de las 13 URL antiguas. Un solo paso.
 */
export function canonicalPath(pathname: string): string {
  let path = pathname.replace(/\/{2,}/g, '/');
  if (!path.startsWith('/')) path = `/${path}`;

  if (path === '/index.html' || path.endsWith('/index.html')) {
    path = path.slice(0, -'index.html'.length);
    if (path === '') path = '/';
  }

  const isApi = path === '/api' || path.startsWith('/api/');
  const isInternal = path.startsWith('/_') || path.startsWith('/.') || path.startsWith('/@');
  const last = path.split('/').filter(Boolean).pop() ?? '';
  const hasExtension = last.includes('.');

  if (!isApi && !isInternal && !hasExtension && path !== '/' && !path.endsWith('/')) {
    path += '/';
  }

  return LEGACY_REDIRECTS[path] ?? path;
}

export function decideCanonical(input: CanonicalInput): CanonicalDecision {
  const hosts = [...hostnamesFrom(input.forwardedHost), ...hostnamesFrom(input.host)];
  const forwardedProto = input.forwardedProto?.split(',')[0]?.trim().toLowerCase() ?? '';
  const isWww = hosts.includes('www.kobor.es');
  const isPublic = isWww || hosts.includes('kobor.es');
  // HTTPS real, o el proxy lo declara, o el host público (Hostinger termina TLS
  // y el salto hasta Node suele ser HTTP sin que el cliente lo vea). Un
  // X-Forwarded-Proto: http explícito no lleva HSTS.
  const https =
    input.encrypted || forwardedProto === 'https' || (forwardedProto !== 'http' && isPublic);

  const nextPath = canonicalPath(input.pathname);
  if (!isWww && nextPath === input.pathname) {
    return { location: null, https };
  }

  const local = !isPublic && hosts.some((host) => LOCAL_HOSTS.has(host));
  const origin = (local ? input.requestOrigin : CANONICAL_ORIGIN).replace(/\/$/, '');
  const search = input.search
    ? input.search.startsWith('?')
      ? input.search
      : `?${input.search}`
    : '';

  return { location: `${origin}${encodeURI(nextPath)}${search}`, https };
}
