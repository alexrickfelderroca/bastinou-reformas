/**
 * Mini-servidor SMTP de pruebas para el pipeline de leads (README §6).
 * Acepta cualquier autenticación, captura el primer mensaje, lo imprime por
 * stdout y sale. NO envía nada a ningún sitio.
 *
 * Uso:
 *   node _build/smtp-catcher.mjs            # escucha en 127.0.0.1:2525
 * y en otra terminal, con estas env vars, arrancar el dev server y enviar
 * el formulario (o hacer POST a /api/lead):
 *   SMTP_HOST=127.0.0.1 SMTP_PORT=2525 SMTP_USER=x SMTP_PASS=x LEAD_TO_EMAIL=admin@kobor.es
 */
import net from 'node:net';

const PORT = Number(process.env.CATCHER_PORT || 2525);

const server = net.createServer((sock) => {
  let inData = false;
  let raw = '';
  let pendingAuthLogin = 0; // pasos del diálogo AUTH LOGIN

  sock.write('220 smtp-catcher ESMTP\r\n');

  sock.on('data', (chunk) => {
    if (inData) {
      raw += chunk.toString('utf8');
      const end = raw.indexOf('\r\n.\r\n');
      if (end !== -1) {
        inData = false;
        sock.write('250 OK: queued\r\n');
        console.log('--- MENSAJE CAPTURADO ---');
        console.log(raw.slice(0, end));
        console.log('--- FIN DEL MENSAJE ---');
        setTimeout(() => process.exit(0), 200);
      }
      return;
    }
    for (const line of chunk.toString('utf8').split('\r\n').filter(Boolean)) {
      const cmd = line.toUpperCase();
      if (pendingAuthLogin > 0) {
        pendingAuthLogin -= 1;
        sock.write(pendingAuthLogin === 1 ? '334 UGFzc3dvcmQ6\r\n' : '235 OK\r\n');
      } else if (cmd.startsWith('EHLO')) {
        sock.write('250-smtp-catcher\r\n250-AUTH LOGIN PLAIN\r\n250 OK\r\n');
      } else if (cmd.startsWith('HELO')) {
        sock.write('250 smtp-catcher\r\n');
      } else if (cmd.startsWith('AUTH PLAIN')) {
        sock.write('235 OK\r\n');
      } else if (cmd.startsWith('AUTH LOGIN')) {
        pendingAuthLogin = 2;
        sock.write('334 VXNlcm5hbWU6\r\n');
      } else if (cmd.startsWith('DATA')) {
        inData = true;
        sock.write('354 End data with <CR><LF>.<CR><LF>\r\n');
      } else if (cmd.startsWith('QUIT')) {
        sock.write('221 Bye\r\n');
        sock.end();
      } else {
        // MAIL FROM, RCPT TO, RSET, NOOP…
        sock.write('250 OK\r\n');
      }
    }
  });

  sock.on('error', () => {});
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`smtp-catcher escuchando en 127.0.0.1:${PORT}`);
});
