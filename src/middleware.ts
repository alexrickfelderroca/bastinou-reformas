/**
 * Redirecciones canónicas y HSTS para dev y para las rutas que sí entran en
 * la app (SSR: 404, /api). En producción el gate de src/server/canonical-gate.ts
 * hace lo mismo antes de los estáticos; aquí se repite para que una petición
 * que ya llegó a Astro no responda la variante no canónica.
 *
 * Cache-Control se aplica sobre la respuesta final (también el 301). Los
 * estáticos y el HTML prerenderizado los cubre server/start.mjs con el mismo
 * helper, porque el adaptador Node los sirve antes de llegar aquí. El gate
 * canónico corre antes: decide el 301 y HSTS, y después se fijan las cabeceras
 * de caché.
 */
import { defineMiddleware } from 'astro:middleware';
import { decideCanonical, HSTS_VALUE } from './lib/canonical-request';
import { applyCacheHeaders } from './server/cache-headers.mjs';

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url } = context;
  const decision = decideCanonical({
    pathname: url.pathname,
    search: url.search,
    host: request.headers.get('host'),
    forwardedHost: request.headers.get('x-forwarded-host'),
    forwardedProto: request.headers.get('x-forwarded-proto'),
    encrypted: url.protocol === 'https:',
    requestOrigin: url.origin,
  });

  if (decision.location) {
    const headers = new Headers({ Location: decision.location });
    if (decision.https) headers.set('Strict-Transport-Security', HSTS_VALUE);
    applyCacheHeaders(url.pathname, request.method, headers, 301);
    return new Response(null, { status: 301, headers });
  }

  const response = await next();
  const headers = new Headers(response.headers);
  if (decision.https && !headers.get('Strict-Transport-Security')) {
    headers.set('Strict-Transport-Security', HSTS_VALUE);
  }
  applyCacheHeaders(url.pathname, request.method, headers, response.status);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
