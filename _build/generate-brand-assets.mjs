/**
 * Genera TODOS los activos de marca Kobor a partir del archivo original del
 * cliente (_build/kobor-logo-source.jpeg — wordmark negro sobre blanco):
 *
 *   src/assets/brand/kobor-logo.svg     wordmark vectorizado (negro, fondo transparente)
 *   src/assets/brand/kobor-logo.png     wordmark 2000px transparente (Header/Footer/JSON-LD)
 *   src/assets/brand/kobor-glyphs.json  subtrazos por glifo + viewBox (loader/hero animados)
 *   public/favicon-512.png · favicon-32.png · apple-touch-icon.png · favicon.ico
 *
 * Uso:  node _build/generate-brand-assets.mjs
 * Requiere: sharp (dep del proyecto) + potrace (devDependency, JS puro).
 */
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const potrace = require('potrace');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, '_build', 'kobor-logo-source.jpeg');
const BRAND = join(ROOT, 'src', 'assets', 'brand');
const PUBLIC = join(ROOT, 'public');
mkdirSync(BRAND, { recursive: true });

/* 1 ─ Preprocesado: gris → binario duro (mata el halo JPEG) → recorte. */
const bin = await sharp(SRC)
  .flatten({ background: '#ffffff' })
  .grayscale()
  .normalise()
  .median(3)
  .threshold(162)
  .png()
  .toBuffer();

const trimmed = await sharp(bin)
  .trim({ threshold: 10 })
  .extend({ top: 8, bottom: 8, left: 8, right: 8, background: '#ffffff' })
  .png()
  .toBuffer();
/* 2 ─ Vectorizado. */
const svgRaw = await new Promise((resolve, reject) => {
  potrace.trace(
    trimmed,
    { threshold: 128, turdSize: 16, alphaMax: 0.55, optTolerance: 0.3, color: 'black' },
    (err, svg) => (err ? reject(err) : resolve(svg)),
  );
});

/* 3 ─ Subtrazos: separa la `d` en M…Z, bbox aproximada por cada uno. */
const dAll = [...svgRaw.matchAll(/d="([^"]+)"/g)].map((m) => m[1]).join(' ');
const subpaths = dAll
  .split(/(?=M)/)
  .map((s) => s.trim())
  .filter(Boolean);

const bboxOf = (d) => {
  const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i], y = nums[i + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
};
const subs = subpaths.map((d) => ({ d, box: bboxOf(d) }));

/* Agujeros = bbox contenida en otra bbox mayor. */
const contains = (a, b, tol = 4) =>
  b.minX >= a.minX - tol && b.maxX <= a.maxX + tol && b.minY >= a.minY - tol && b.maxY <= a.maxY + tol;
subs.forEach((s) => {
  s.isHole = subs.some((o) => o !== s && o.box.w * o.box.h > s.box.w * s.box.h && contains(o.box, s.box));
});

/* Agrupa contornos exteriores en glifos por solape horizontal. */
const outers = subs.filter((s) => !s.isHole).sort((a, b) => a.box.minX - b.box.minX);
const glyphs = [];
for (const o of outers) {
  const last = glyphs[glyphs.length - 1];
  if (last && o.box.minX < last.box.maxX - 6) {
    last.parts.push(o);
    last.box.maxX = Math.max(last.box.maxX, o.box.maxX);
    last.box.minY = Math.min(last.box.minY, o.box.minY);
    last.box.maxY = Math.max(last.box.maxY, o.box.maxY);
    last.box.minX = Math.min(last.box.minX, o.box.minX);
  } else {
    glyphs.push({ parts: [o], box: { ...o.box } });
  }
}
subs.filter((s) => s.isHole).forEach((h) => {
  const host = glyphs.find((g) => contains(g.box, h.box, 8));
  (host ?? glyphs[0]).parts.push(h);
});
glyphs.forEach((g) => (g.d = g.parts.map((p) => p.d).join(' ')));

console.log(`Vectorizado: ${subs.length} subtrazos → ${glyphs.length} glifos`);
glyphs.forEach((g, i) =>
  console.log(`  glifo ${i}: x ${Math.round(g.box.minX)}–${Math.round(g.box.maxX)}, y ${Math.round(g.box.minY)}–${Math.round(g.box.maxY)} (${g.parts.length} trazos)`),
);

/* 4 ─ SVG completo (viewBox ceñida al contenido real). */
const all = glyphs.flatMap((g) => g.parts);
const MINX = Math.min(...all.map((s) => s.box.minX)) - 4;
const MINY = Math.min(...all.map((s) => s.box.minY)) - 4;
const MAXX = Math.max(...all.map((s) => s.box.maxX)) + 4;
const MAXY = Math.max(...all.map((s) => s.box.maxY)) + 4;
const VW = Math.round(MAXX - MINX), VH = Math.round(MAXY - MINY);

const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${Math.round(MINX)} ${Math.round(MINY)} ${VW} ${VH}" fill="currentColor" role="img" aria-label="Kobor">
${glyphs.map((g) => `  <path d="${g.d}"/>`).join('\n')}
</svg>
`;
writeFileSync(join(BRAND, 'kobor-logo.svg'), fullSvg);

/* Glifos para el loader/hero (sistema de coordenadas compartido). */
writeFileSync(
  join(BRAND, 'kobor-glyphs.json'),
  JSON.stringify(
    {
      viewBox: { x: Math.round(MINX), y: Math.round(MINY), w: VW, h: VH },
      glyphs: glyphs.map((g) => ({
        d: g.d,
        x: Math.round(g.box.minX),
        y: Math.round(g.box.minY),
        w: Math.round(g.box.maxX - g.box.minX),
        h: Math.round(g.box.maxY - g.box.minY),
      })),
    },
    null,
    2,
  ),
);

/* 5 ─ PNG del wordmark (negro sobre transparente, 2000px). */
const pngSvg = fullSvg.replace('fill="currentColor"', 'fill="#0a0a0a"');
await sharp(Buffer.from(pngSvg), { density: 300 })
  .resize({ width: 2000 })
  .png()
  .toFile(join(BRAND, 'kobor-logo.png'));

/* 6 ─ Favicons: glifo "k" centrado sobre crema (#f7f5f0). */
const k = glyphs[0];
const pad = Math.round(Math.max(k.box.w ?? 0, k.box.maxX - k.box.minX, k.box.maxY - k.box.minY) * 0.18);
const kw = k.box.maxX - k.box.minX, kh = k.box.maxY - k.box.minY;
const side = Math.round(Math.max(kw, kh) + pad * 2);
const kx = Math.round(k.box.minX - (side - kw) / 2);
const ky = Math.round(k.box.minY - (side - kh) / 2);
const kSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${kx} ${ky} ${side} ${side}">
  <rect x="${kx}" y="${ky}" width="${side}" height="${side}" fill="#f7f5f0"/>
  <path d="${k.d}" fill="#0a0a0a"/>
</svg>`;
const icon = (px) => sharp(Buffer.from(kSvg), { density: 300 }).resize(px, px).png().toBuffer();

writeFileSync(join(PUBLIC, 'favicon-512.png'), await icon(512));
writeFileSync(join(PUBLIC, 'favicon-32.png'), await icon(32));
writeFileSync(join(PUBLIC, 'apple-touch-icon.png'), await icon(180));

/* favicon.ico: una entrada PNG de 256px (formato ICO con PNG embebido). */
const png256 = await icon(256);
const ico = Buffer.alloc(6 + 16);
ico.writeUInt16LE(0, 0); // reserved
ico.writeUInt16LE(1, 2); // type: icon
ico.writeUInt16LE(1, 4); // count
ico.writeUInt8(0, 6); // width 256 → 0
ico.writeUInt8(0, 7); // height 256 → 0
ico.writeUInt8(0, 8); // palette
ico.writeUInt8(0, 9); // reserved
ico.writeUInt16LE(1, 10); // planes
ico.writeUInt16LE(32, 12); // bpp
ico.writeUInt32LE(png256.length, 14); // size
ico.writeUInt32LE(22, 18); // offset
writeFileSync(join(PUBLIC, 'favicon.ico'), Buffer.concat([ico, png256]));

console.log(`OK — SVG ${VW}×${VH}, PNG 2000px, favicons regenerados.`);
