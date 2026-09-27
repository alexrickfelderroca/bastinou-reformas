/**
 * Genera TODOS los activos de marca Kobor a partir del logotipo del cliente.
 *
 * Fuente (desde el 27-09-2026): _build/kobor-logo-source-2026-09.jpg — el logo
 * nuevo que envió Mike: formato cuadrado, BLANCO sobre negro, wordmark «kobor»
 * de trazo fino + «REFORMAS» + «— BARCELONA —». (La fuente anterior,
 * kobor-logo-source.jpeg, era el wordmark grueso negro sobre blanco; se deja en
 * _build como histórico, ya no se usa.)
 *
 *   src/assets/brand/kobor-logo.svg     wordmark vectorizado (currentColor)
 *   src/assets/brand/kobor-logo.png     wordmark 2000px, negro sobre transparente (Header/JSON-LD)
 *   src/assets/brand/kobor-glyphs.json  subtrazos por glifo + viewBox (loader/hero/OG)
 *   src/assets/brand/kobor-lockup.svg   logo completo: kobor + REFORMAS + — BARCELONA — (currentColor)
 *   src/assets/brand/kobor-lockup.png   logo completo 2000px, negro sobre transparente (pie)
 *   public/favicon-32.png · favicon.ico               glifo «k» blanco sobre negro
 *   public/apple-touch-icon.png · favicon-512.png      logo completo sobre negro (como el de redes)
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
const SRC = join(ROOT, '_build', 'kobor-logo-source-2026-09.jpg');
const BRAND = join(ROOT, 'src', 'assets', 'brand');
const PUBLIC = join(ROOT, 'public');
mkdirSync(BRAND, { recursive: true });

/* Negro de marca para los PNG y el fondo de los iconos. El logo del cliente
   es negro puro; #0a0a0a se ve igual y es el negro que ya usaba el sitio. */
const NEGRO = '#0a0a0a';

/* El JPEG mide 1254px y el wordmark tiene trazos de ~22px: se vectoriza a
   ESCALA× para que el umbral caiga en el borde real (sub-píxel) y no en la
   escalera del JPEG. Todas las tolerancias de abajo van multiplicadas. */
const ESCALA = 3;

/* 1 ─ Preprocesado, paso a paso (sharp no garantiza el orden de las
   operaciones encadenadas): negativo → ampliación → binario duro → recorte. */
const meta = await sharp(SRC).metadata();
const gris = await sharp(SRC).grayscale().negate().png().toBuffer(); // negro sobre blanco
const grande = await sharp(gris)
  .resize({ width: meta.width * ESCALA, kernel: 'lanczos3' })
  .png()
  .toBuffer();
const bin = await sharp(grande).median(3).threshold(128).png().toBuffer();
const trimmed = await sharp(bin)
  .trim({ threshold: 10 })
  .extend({ top: 8 * ESCALA, bottom: 8 * ESCALA, left: 8 * ESCALA, right: 8 * ESCALA, background: '#ffffff' })
  .png()
  .toBuffer();

/* 2 ─ Vectorizado. */
const svgRaw = await new Promise((resolve, reject) => {
  potrace.trace(
    trimmed,
    { threshold: 128, turdSize: 16 * ESCALA * ESCALA, alphaMax: 0.55, optTolerance: 0.3, color: 'black' },
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
const contains = (a, b, tol = 4 * ESCALA) =>
  b.minX >= a.minX - tol && b.maxX <= a.maxX + tol && b.minY >= a.minY - tol && b.maxY <= a.maxY + tol;
subs.forEach((s) => {
  s.isHole = subs.some((o) => o !== s && o.box.w * o.box.h > s.box.w * s.box.h && contains(o.box, s.box));
});

/* 4 ─ Bandas horizontales del logo completo: wordmark · REFORMAS · — BARCELONA —.
   Una banda crece mientras haya trazos que se solapen con ella en vertical. */
const porY = [...subs].sort((a, b) => a.box.minY - b.box.minY);
const bandas = [];
for (const s of porY) {
  const b = bandas[bandas.length - 1];
  if (b && s.box.minY <= b.maxY) {
    b.subs.push(s);
    b.maxY = Math.max(b.maxY, s.box.maxY);
  } else {
    bandas.push({ minY: s.box.minY, maxY: s.box.maxY, subs: [s] });
  }
}
if (bandas.length !== 3) {
  throw new Error(`Se esperaban 3 bandas (kobor · REFORMAS · BARCELONA) y salen ${bandas.length}: revisa el umbral.`);
}
const wordSubs = bandas[0].subs;

/* 5 ─ Glifos del wordmark: contornos exteriores agrupados por solape horizontal
   (k · ob · o · r — la «o» y la «b» van unidas por arriba), huecos a su glifo. */
const outers = wordSubs.filter((s) => !s.isHole).sort((a, b) => a.box.minX - b.box.minX);
const glyphs = [];
for (const o of outers) {
  const last = glyphs[glyphs.length - 1];
  if (last && o.box.minX < last.box.maxX - 6 * ESCALA) {
    last.parts.push(o);
    last.box.maxX = Math.max(last.box.maxX, o.box.maxX);
    last.box.minY = Math.min(last.box.minY, o.box.minY);
    last.box.maxY = Math.max(last.box.maxY, o.box.maxY);
    last.box.minX = Math.min(last.box.minX, o.box.minX);
  } else {
    glyphs.push({ parts: [o], box: { ...o.box } });
  }
}
wordSubs.filter((s) => s.isHole).forEach((h) => {
  const host = glyphs.find((g) => contains(g.box, h.box, 8 * ESCALA));
  (host ?? glyphs[0]).parts.push(h);
});
glyphs.forEach((g) => (g.d = g.parts.map((p) => p.d).join(' ')));

/* El loader parte el wordmark en «kob» | caja | «or» con glyphs.slice(0, 2):
   si el vectorizado no da exactamente k · ob · o · r, eso se rompería callado. */
if (glyphs.length !== 4) {
  throw new Error(`El wordmark debería dar 4 glifos (k · ob · o · r) y da ${glyphs.length}.`);
}

console.log(`Vectorizado: ${subs.length} subtrazos → wordmark de ${glyphs.length} glifos + ${bandas[1].subs.length + bandas[2].subs.length} trazos de texto`);
glyphs.forEach((g, i) =>
  console.log(`  glifo ${i}: x ${Math.round(g.box.minX)}–${Math.round(g.box.maxX)}, y ${Math.round(g.box.minY)}–${Math.round(g.box.maxY)} (${g.parts.length} trazos)`),
);

/* 6 ─ SVGs (viewBox ceñida al contenido real). */
const caja = (lista, pad = 4 * ESCALA) => {
  const minX = Math.min(...lista.map((s) => s.box.minX)) - pad;
  const minY = Math.min(...lista.map((s) => s.box.minY)) - pad;
  const maxX = Math.max(...lista.map((s) => s.box.maxX)) + pad;
  const maxY = Math.max(...lista.map((s) => s.box.maxY)) + pad;
  return { x: Math.round(minX), y: Math.round(minY), w: Math.round(maxX - minX), h: Math.round(maxY - minY) };
};

/* fill-rule="evenodd": los contornos y sus huecos vienen de potrace con
   sentidos de giro no garantizados; evenodd recorta los huecos SIEMPRE
   (con nonzero la "o" salía maciza). */
const svgDe = (vb, paths, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" fill="currentColor" role="img" aria-label="Kobor Reformas"${extra}>
${paths.map((d) => `  <path fill-rule="evenodd" d="${d}"/>`).join('\n')}
</svg>
`;

const vbWord = caja(glyphs.flatMap((g) => g.parts));
const wordSvg = svgDe(vbWord, glyphs.map((g) => g.d));
writeFileSync(join(BRAND, 'kobor-logo.svg'), wordSvg);

const vbLock = caja(subs);
/* Cada banda de texto va en UN solo <path>: evenodd solo recorta huecos dentro
   del mismo path, y con un path por contorno la «O», la «R», la «A» y la «B»
   salían macizas. */
const lockPaths = [
  ...glyphs.map((g) => g.d),
  bandas[1].subs.map((s) => s.d).join(' '),
  bandas[2].subs.map((s) => s.d).join(' '),
];
const lockSvg = svgDe(vbLock, lockPaths);
writeFileSync(join(BRAND, 'kobor-lockup.svg'), lockSvg);

/* Glifos para el loader/hero/OG (sistema de coordenadas compartido). */
writeFileSync(
  join(BRAND, 'kobor-glyphs.json'),
  JSON.stringify(
    {
      viewBox: vbWord,
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
  ) + '\n',
);

/* 7 ─ PNG (negro sobre transparente, 2000px de ancho). Se rasteriza al tamaño
   final declarando width/height: con density sobre un viewBox de ~2800
   unidades saldría un lienzo de >10 000px. */
const png = async (svg, vb, ancho, destino) => {
  const alto = Math.round((ancho * vb.h) / vb.w);
  const s = svg
    .replace('fill="currentColor"', `fill="${NEGRO}" width="${ancho}" height="${alto}"`);
  await sharp(Buffer.from(s)).png().toFile(destino);
};
await png(wordSvg, vbWord, 2000, join(BRAND, 'kobor-logo.png'));
await png(lockSvg, vbLock, 2000, join(BRAND, 'kobor-lockup.png'));

/* 8 ─ Iconos.
   · 180 y 512 (pantalla de inicio, Android, Google): el logo completo sobre
     negro, con la misma composición que el cuadrado del cliente (el lockup
     ocupa ~74 % del ancho, centrado) — es lo mismo que se ve en las redes.
   · 32 y .ico (pestaña del navegador): a ese tamaño el logo completo es una
     raya; va solo la «k», blanca sobre negro. */
const cuadradoLockup = (px) => {
  const lado = vbLock.w / 0.743;
  const x0 = vbLock.x - (lado - vbLock.w) / 2;
  const y0 = vbLock.y - (lado - vbLock.h) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="${x0} ${y0} ${lado} ${lado}">
  <rect x="${x0}" y="${y0}" width="${lado}" height="${lado}" fill="${NEGRO}"/>
${lockPaths.map((d) => `  <path fill="#ffffff" fill-rule="evenodd" d="${d}"/>`).join('\n')}
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
};

const k = glyphs[0];
const kw = k.box.maxX - k.box.minX, kh = k.box.maxY - k.box.minY;
const pad = Math.round(Math.max(kw, kh) * 0.18);
const side = Math.round(Math.max(kw, kh) + pad * 2);
const kx = Math.round(k.box.minX - (side - kw) / 2);
const ky = Math.round(k.box.minY - (side - kh) / 2);
const iconoK = (px) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="${kx} ${ky} ${side} ${side}">
  <rect x="${kx}" y="${ky}" width="${side}" height="${side}" fill="${NEGRO}"/>
  <path d="${k.d}" fill="#ffffff" fill-rule="evenodd"/>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
};

writeFileSync(join(PUBLIC, 'favicon-512.png'), await cuadradoLockup(512));
writeFileSync(join(PUBLIC, 'apple-touch-icon.png'), await cuadradoLockup(180));
writeFileSync(join(PUBLIC, 'favicon-32.png'), await iconoK(32));

/* favicon.ico: una entrada PNG de 256px (formato ICO con PNG embebido). */
const png256 = await iconoK(256);
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

console.log(`OK — wordmark ${vbWord.w}×${vbWord.h}, logo completo ${vbLock.w}×${vbLock.h}, PNG 2000px, favicons regenerados.`);
