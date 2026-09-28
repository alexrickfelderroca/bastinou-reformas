/**
 * Cache-Control de las respuestas que sí pasan por el middleware (sobre todo
 * /api/lead). Los estáticos y el HTML prerenderizado los cubre server/start.mjs
 * con el mismo helper, porque el adaptador Node los sirve antes de llegar aquí.
 *
 * Si otro cambio sustituye este archivo (redirecciones, HSTS), hay que seguir
 * llamando a applyCacheHeaders() sobre la respuesta final.
 */
import { defineMiddleware } from 'astro:middleware';
import { applyCacheHeaders } from './server/cache-headers.mjs';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  applyCacheHeaders(context.url.pathname, context.request.method, response.headers, response.status);
  return response;
});
