/**
 * Arranque de producción. Envuelve el servidor standalone de @astrojs/node
 * para fijar Cache-Control y el Content-Type de .webm/.mp4 en TODAS las
 * respuestas, también las que `send` sirve desde dist/client (HTML, /hero,
 * /fonts, /_astro) y que no pasan por src/middleware.ts.
 *
 * Hostinger ejecuta `npm start`. No sustituye a dist/server/entry.mjs: lo
 * importa con el autostart apagado y reutiliza su handler.
 */
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import { cacheControlFor, contentTypeOverride } from '../src/server/cache-headers.mjs';

process.env.ASTRO_NODE_AUTOSTART = 'disabled';

const { handler, options } = await import('../dist/server/entry.mjs');

function resolveHost(host) {
  if (process.env.HOST) return process.env.HOST;
  if (host === true) return '0.0.0.0';
  if (host === false || host == null || host === '') return 'localhost';
  return host;
}

/**
 * Aplica la política en el último momento, cuando las cabeceras van a salir.
 * `send` escribe Cache-Control (max-age=0) antes de hacer pipe; si solo
 * hiciéramos setHeader al entrar, el estático lo pisaría.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
function installHeaderPolicy(req, res) {
  const pathname = (req.url || '/').split('?')[0];
  const method = req.method || 'GET';
  const origWriteHead = res.writeHead;
  const origEnd = res.end;
  let applied = false;

  const apply = (status) => {
    if (applied || res.headersSent) return;
    applied = true;
    const cache = cacheControlFor(pathname, method, status);
    const type = contentTypeOverride(pathname);
    if (cache) res.setHeader('Cache-Control', cache);
    if (type) res.setHeader('Content-Type', type);
  };

  const stamp = (status, hdrs) => {
    apply(status);
    if (!hdrs || typeof hdrs !== 'object' || Array.isArray(hdrs)) return hdrs;
    const cache = cacheControlFor(pathname, method, status);
    const type = contentTypeOverride(pathname);
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

const port = process.env.PORT ? Number(process.env.PORT) : options.port ?? 8080;
const host = resolveHost(options.host);

const listener = (req, res) => {
  try {
    decodeURI(req.url || '/');
  } catch {
    res.writeHead(400);
    res.end('Bad request.');
    return;
  }
  installHeaderPolicy(req, res);
  handler(req, res);
};

const server =
  process.env.SERVER_CERT_PATH && process.env.SERVER_KEY_PATH
    ? https.createServer(
        {
          key: fs.readFileSync(process.env.SERVER_KEY_PATH),
          cert: fs.readFileSync(process.env.SERVER_CERT_PATH),
        },
        listener,
      )
    : http.createServer(listener);

server.listen(port, host, () => {
  console.log(`[@kobor] Server listening on http://${host}:${port}`);
});
