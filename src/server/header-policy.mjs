/**
 * Política de Cache-Control y Content-Type sobre la respuesta HTTP de Node.
 *
 * Se inyecta DENTRO de dist/server/entry.mjs (plugin `kobor-canonical-http` de
 * astro.config.mjs), delante del gate canónico y del servidor de estáticos de
 * @astrojs/node. Así se aplica arranque como arranque Hostinger el proceso:
 * `npm start` (server/start.mjs) o el "Entry file" del panel apuntando
 * directamente a dist/server/entry.mjs.
 *
 * Antes (PR #7) esta envoltura sólo vivía en server/start.mjs. En producción
 * Hostinger ejecuta dist/server/entry.mjs directamente y el HTML salía con el
 * `public, max-age=0` por defecto de `send`, sin s-maxage.
 *
 * `send` escribe Cache-Control (max-age=0) antes de hacer pipe; si sólo
 * hiciéramos setHeader al entrar, el estático lo pisaría. Por eso se sella al
 * escribir las cabeceras (writeHead / end).
 */
import { cacheControlFor, contentTypeOverride } from './cache-headers.mjs';

/** Marcador que el build busca en dist/server (ver koborCanonicalCheck). */
export const HEADER_POLICY_MARKER = 'kobor-header-policy';

const INSTALLED = Symbol.for('kobor.headerPolicyInstalled');

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
export function installHeaderPolicy(req, res) {
  // Idempotente: si server/start.mjs y el entry la instalasen los dos, una vez.
  if (/** @type {any} */ (res)[INSTALLED]) return;
  /** @type {any} */ (res)[INSTALLED] = HEADER_POLICY_MARKER;

  const pathname = (req.url || '/').split('?')[0];
  const method = req.method || 'GET';
  const origWriteHead = res.writeHead;
  const origEnd = res.end;
  let applied = false;

  const apply = (status) => {
    if (applied || res.headersSent) return;
    applied = true;
    const cache = cacheControlFor(pathname, method, status);
    const type = contentTypeOverride(pathname, status);
    if (cache) res.setHeader('Cache-Control', cache);
    if (type) res.setHeader('Content-Type', type);
  };

  const stamp = (status, hdrs) => {
    apply(status);
    if (!hdrs || typeof hdrs !== 'object' || Array.isArray(hdrs)) return hdrs;
    const cache = cacheControlFor(pathname, method, status);
    const type = contentTypeOverride(pathname, status);
    if (cache) {
      delete hdrs['Cache-Control'];
      delete hdrs['cache-control'];
      hdrs['Cache-Control'] = cache;
    }
    if (type) {
      delete hdrs['Content-Type'];
      delete hdrs['content-type'];
      hdrs['Content-Type'] = type;
    }
    return hdrs;
  };

  res.writeHead = function writeHead(status, reason, headers) {
    if (typeof reason === 'object' && reason !== null) {
      return origWriteHead.call(this, status, stamp(status, reason));
    }
    if (headers && typeof headers === 'object') {
      return origWriteHead.call(this, status, reason, stamp(status, headers));
    }
    apply(typeof status === 'number' ? status : 200);
    return origWriteHead.apply(this, arguments);
  };

  res.end = function end(...args) {
    apply(res.statusCode || 200);
    return origEnd.apply(this, args);
  };
}
