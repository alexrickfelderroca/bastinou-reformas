/**
 * Arranque alternativo (`npm start`). Importa dist/server/entry.mjs con el
 * autostart apagado y reutiliza su handler.
 *
 * La política de Cache-Control / Content-Type ya va DENTRO del entry
 * (src/server/header-policy.mjs, inyectada por astro.config.mjs), porque en
 * Hostinger el panel arranca dist/server/entry.mjs directamente y este
 * archivo no se ejecuta. Aquí se vuelve a instalar sólo por si acaso: es
 * idempotente. No redirige /api/lead ni le pone caché pública.
 */
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import { installHeaderPolicy } from '../src/server/header-policy.mjs';

process.env.ASTRO_NODE_AUTOSTART = 'disabled';

const { handler, options } = await import('../dist/server/entry.mjs');

function resolveHost(host) {
  if (process.env.HOST) return process.env.HOST;
  if (host === true) return '0.0.0.0';
  if (host === false || host == null || host === '') return 'localhost';
  return host;
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
  // El handler ya instala la política; esta llamada es un no-op idempotente.
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
