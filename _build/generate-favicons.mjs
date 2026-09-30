/**
 * Genera el juego de favicons de kobor.es a partir del glifo «k» del logotipo
 * (src/assets/brand/kobor-glyphs.json, que escribe generate-brand-assets.mjs).
 *
 * Todos los iconos son la MISMA marca: la «k» blanca centrada sobre el negro de
 * marca. El logo completo (kobor + REFORMAS + — BARCELONA —) es una raya
 * ilegible a 16-48 px, que es como lo pintan la pestaña y Google; por eso ya no
 * se usa en ningún icono.
 *
 *   public/favicon.ico              16 · 32 · 48 px (PNG embebidos)
 *   public/favicon.svg              vectorial (navegadores modernos)
 *   public/favicon-32.png           32 px (URL de siempre, se mantiene)
 *   public/favicon-48x48.png        48 px
 *   public/favicon-96x96.png        96 px  (múltiplo de 48: el que lee Google)
 *   public/favicon-512.png          512 px (URL de siempre, se mantiene)
 *   public/apple-touch-icon.png     180 px (iOS, fondo opaco)
 *   public/icon-192.png             192 px (manifest; el de 512 es favicon-512.png)
 *   public/icon-maskable-512.png    512 px (manifest, purpose maskable, más margen)
 *
 * Uso:  node _build/generate-favicons.mjs
 * (generate-brand-assets.mjs lo llama al final, así que regenerar la marca
 * regenera también los favicons.)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const { glyphs } = JSON.parse(
  readFileSync(join(ROOT, 'src', 'assets', 'brand', 'kobor-glyphs.json'), 'utf8'),
);

/* Mismo negro de marca que generate-brand-assets.mjs. */
const NEGRO = '#0a0a0a';

/* La «k» es el primer glifo del wordmark (k · ob · o · r). */
const k = glyphs[0];

/**
 * SVG cuadrado con la «k» centrada. `margen` es el aire a cada lado en
 * fracción del lado mayor del glifo: 0.18 es el encuadre que ya tenía la
 * pestaña; el maskable necesita más para caber en la zona segura (círculo del
 * 80 %) de Android.
 */
const svgK = (margen, px) => {
  const lado = Math.max(k.w, k.h);
  const pad = Math.round(lado * margen);
  const side = Math.round(lado + pad * 2);
  const x = Math.round(k.x - (side - k.w) / 2);
  const y = Math.round(k.y - (side - k.h) / 2);
  const dim = px ? ` width="${px}" height="${px}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg"${dim} viewBox="${x} ${y} ${side} ${side}"><rect x="${x}" y="${y}" width="${side}" height="${side}" fill="${NEGRO}"/><path d="${k.d}" fill="#ffffff" fill-rule="evenodd"/></svg>\n`;
};

const png = (px, margen = 0.18) =>
  sharp(Buffer.from(svgK(margen, px))).png().toBuffer();

/* ICO con varias entradas PNG (formato válido desde Windows Vista; lo leen
   todos los navegadores y Google). */
const ico = (entradas) => {
  const cab = Buffer.alloc(6);
  cab.writeUInt16LE(0, 0);
  cab.writeUInt16LE(1, 2);
  cab.writeUInt16LE(entradas.length, 4);
  const dir = Buffer.alloc(16 * entradas.length);
  let offset = 6 + dir.length;
  entradas.forEach(({ px, buf }, i) => {
    const o = i * 16;
    dir.writeUInt8(px >= 256 ? 0 : px, o);
    dir.writeUInt8(px >= 256 ? 0 : px, o + 1);
    dir.writeUInt8(0, o + 2);
    dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(buf.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += buf.length;
  });
  return Buffer.concat([cab, dir, ...entradas.map((e) => e.buf)]);
};

const icoSizes = [16, 32, 48];
const icoEntries = await Promise.all(icoSizes.map(async (px) => ({ px, buf: await png(px) })));
writeFileSync(join(PUBLIC, 'favicon.ico'), ico(icoEntries));
writeFileSync(join(PUBLIC, 'favicon.svg'), svgK(0.18));

const pngs = {
  'favicon-32.png': 32,
  'favicon-48x48.png': 48,
  'favicon-96x96.png': 96,
  'favicon-512.png': 512,
  'apple-touch-icon.png': 180,
  'icon-192.png': 192,
};
for (const [nombre, px] of Object.entries(pngs)) {
  writeFileSync(join(PUBLIC, nombre), await png(px));
}
/* Maskable: la «k» ocupa ~56 % del lado → su caja entra en el círculo del 80 %. */
writeFileSync(join(PUBLIC, 'icon-maskable-512.png'), await png(512, 0.39));

console.log(
  `OK — favicons «k»: ico ${icoSizes.join('/')}, svg, ${Object.values(pngs).join('/')} y maskable 512.`,
);
