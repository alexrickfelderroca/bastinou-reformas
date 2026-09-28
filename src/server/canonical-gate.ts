/**
 * Corre DENTRO del servidor standalone, antes de que @astrojs/node sirva los
 * HTML prerenderizados. Sin esto, /contacto, /index.html y www.kobor.es
 * responderían 200: el middleware de Astro no llega a ver esas peticiones.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { decideCanonical, HSTS_VALUE } from '../lib/canonical-request';

function headerValue(req: IncomingMessage, name: string): string | null {
  const value = req.headers[name];
  if (Array.isArray(value)) return value.join(',');
  return value ?? null;
}

/**
 * @returns true si la respuesta ya se ha enviado (400 o 301).
 */
export function canonicalGate(req: IncomingMessage, res: ServerResponse): boolean {
  // Marcador que el build comprueba en dist/server. Si desaparece, el gate
  // no se empaquetó y las redirecciones de estáticos no existirían.
  if (req.headers['x-kobor-canonical-gate'] === 'kobor-pre-static-gate') {
    res.setHeader('X-Kobor-Canonical-Gate', 'kobor-pre-static-gate');
  }

  const rawUrl = req.url ?? '/';
  const q = rawUrl.indexOf('?');
  let pathname = q >= 0 ? rawUrl.slice(0, q) : rawUrl;
  const search = q >= 0 ? rawUrl.slice(q) : '';
  try {
    pathname = decodeURI(pathname);
  } catch {
    res.writeHead(400);
    res.end('Bad request.');
    return true;
  }

  const encrypted = Boolean((req.socket as { encrypted?: boolean } | undefined)?.encrypted);
  const host = headerValue(req, 'host');
  const decision = decideCanonical({
    pathname,
    search,
    host,
    forwardedHost: headerValue(req, 'x-forwarded-host'),
    forwardedProto: headerValue(req, 'x-forwarded-proto'),
    encrypted,
    requestOrigin: `${encrypted ? 'https' : 'http'}://${host ?? 'localhost'}`,
  });

  if (decision.location) {
    const headers: Record<string, string> = { Location: decision.location };
    if (decision.https) headers['Strict-Transport-Security'] = HSTS_VALUE;
    res.writeHead(301, headers);
    res.end();
    return true;
  }

  if (decision.https) res.setHeader('Strict-Transport-Security', HSTS_VALUE);
  return false;
}
