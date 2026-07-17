/**
 * Endpoint que prerenderiza una imagen OG PNG (1200×630) por página e idioma
 * (CLAUDE.pdf §8 — Fase 8). Rutas: /og/<id>-<locale>.png, donde <id> es un
 * routeKey (home, pisos, …, cookies), 'default' o 'proyecto-<slug>'.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { locales, type Locale } from '../../i18n/ui';
import { OG_ROUTE_IDS } from '../../lib/og-meta';
import { renderOgPng } from '../../lib/og-render';

export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
  const projects = await getCollection('projects');
  const ids = [
    ...OG_ROUTE_IDS,
    'default',
    ...projects.map((p) => `proyecto-${p.id}`),
  ];
  return ids.flatMap((id) =>
    locales.map((locale) => ({ params: { og: `${id}-${locale}` }, props: { id, locale } })),
  );
};

export const GET: APIRoute = async ({ props }) => {
  const { id, locale } = props as { id: string; locale: Locale };
  const png = await renderOgPng(id, locale);
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
