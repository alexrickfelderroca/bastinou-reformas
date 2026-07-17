/**
 * Render de imágenes Open Graph (1200×630) en build (CLAUDE.pdf §8 — Fase 8).
 * satori (JS puro) convierte una plantilla a SVG con el texto ya vectorizado en
 * trazos usando Inter (woff de @fontsource/inter), y sharp (ya presente por
 * astro:assets) rasteriza ese SVG a PNG — sin binarios nativos extra ni fuentes
 * en el rasterizado. Sólo lo usa el endpoint `/og/[og].png.ts` (server, build).
 * Estética B/N premium: fondo tinta, titular blanco, marca abajo. Cero color.
 */
import satori from 'satori';
import sharp from 'sharp';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { ogContent } from './og-meta';
import type { Locale } from '../i18n/ui';

const require = createRequire(import.meta.url);
const fontData = (weight: number) =>
  readFileSync(require.resolve(`@fontsource/inter/files/inter-latin-${weight}-normal.woff`));

// Se cargan una sola vez por proceso de build.
const fonts = [
  { name: 'Inter', data: fontData(400), weight: 400 as const, style: 'normal' as const },
  { name: 'Inter', data: fontData(600), weight: 600 as const, style: 'normal' as const },
  { name: 'Inter', data: fontData(700), weight: 700 as const, style: 'normal' as const },
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
      background: '#0a0a0a',
      color: '#ffffff',
      padding: '72px',
      fontFamily: 'Inter',
    },
    [
      node('div', { display: 'flex', fontSize: 30, letterSpacing: '0.14em', color: '#999999' }, eyebrow.toUpperCase()),
      node(
        'div',
        { display: 'flex', fontSize: 74, fontWeight: 600, lineHeight: 1.06, letterSpacing: '-0.02em', maxWidth: '1000px' },
        title,
      ),
      node(
        'div',
        { display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #333333', paddingTop: '32px' },
        [
          node('div', { display: 'flex', fontSize: 42, fontWeight: 700, letterSpacing: '-0.01em' }, 'Bastinou'),
          node('div', { display: 'flex', fontSize: 26, color: '#999999' }, 'bastinou.com'),
        ],
      ),
    ],
  );

  const svg = await satori(tree as Parameters<typeof satori>[0], { width: 1200, height: 630, fonts });
  return sharp(Buffer.from(svg)).png().toBuffer();
}
