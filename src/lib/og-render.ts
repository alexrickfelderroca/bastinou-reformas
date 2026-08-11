/**
 * Render de imágenes Open Graph (1200×630) en build (CLAUDE.pdf §8 — Fase 8).
 * satori (JS puro) convierte una plantilla a SVG con el texto ya vectorizado en
 * trazos usando Hanken Grotesk (woff de @fontsource/hanken-grotesk), y sharp (ya
 * presente por astro:assets) rasteriza ese SVG a PNG — sin binarios nativos extra
 * ni fuentes en el rasterizado. Sólo lo usa el endpoint `/og/[og].png.ts`.
 * Estética clara Kobor: fondo crema, titular verde oscuro, acento salvia.
 */
import satori from 'satori';
import sharp from 'sharp';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { ogContent } from './og-meta';
import type { Locale } from '../i18n/ui';
import brand from '../assets/brand/kobor-glyphs.json';

// Wordmark real de Kobor como <img> embebido (SVG → data URI): así la tarjeta
// OG lleva el logotipo del cliente, no el nombre tipografiado.
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${brand.viewBox.x} ${brand.viewBox.y} ${brand.viewBox.w} ${brand.viewBox.h}">${brand.glyphs
  .map((g) => `<path d="${g.d}" fill="#24443c"/>`)
  .join('')}</svg>`;
const logoSrc = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;
const LOGO_H = 40;
const LOGO_W = Math.round((LOGO_H * brand.viewBox.w) / brand.viewBox.h);

const require = createRequire(import.meta.url);
const fontData = (weight: number) =>
  readFileSync(require.resolve(`@fontsource/hanken-grotesk/files/hanken-grotesk-latin-${weight}-normal.woff`));

// Se cargan una sola vez por proceso de build.
const fonts = [
  { name: 'Hanken Grotesk', data: fontData(400), weight: 400 as const, style: 'normal' as const },
  { name: 'Hanken Grotesk', data: fontData(600), weight: 600 as const, style: 'normal' as const },
  { name: 'Hanken Grotesk', data: fontData(700), weight: 700 as const, style: 'normal' as const },
];

// satori acepta el árbol con forma de elemento React (type/props); no usa React.
const node = (type: string, style: Record<string, unknown>, children: unknown) => ({
  type,
  props: { style, children },
});

export async function renderOgPng(id: string, locale: Locale): Promise<Buffer> {
  const { eyebrow, title } = ogContent(id, locale);

  const tree = node(
    'div',
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      background: '#f7f5f0',
      color: '#20372f',
      padding: '72px',
      fontFamily: 'Hanken Grotesk',
    },
    [
      node('div', { display: 'flex', fontSize: 30, letterSpacing: '0.14em', color: '#5c7261' }, eyebrow.toUpperCase()),
      node(
        'div',
        { display: 'flex', fontSize: 74, fontWeight: 600, lineHeight: 1.06, letterSpacing: '-0.02em', maxWidth: '1000px' },
        title,
      ),
      node(
        'div',
        { display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #d8d4c9', paddingTop: '32px' },
        [
          { type: 'img', props: { src: logoSrc, width: LOGO_W, height: LOGO_H, style: { display: 'flex' } } },
          node('div', { display: 'flex', fontSize: 26, color: '#5f6f66' }, 'kobor.es'),
        ],
      ),
    ],
  );

  const svg = await satori(tree as Parameters<typeof satori>[0], { width: 1200, height: 630, fonts });
  return sharp(Buffer.from(svg)).png().toBuffer();
}
