/**
 * robots.txt (CLAUDE.pdf §8 — Fase 8). Endpoint prerenderizado para que la URL
 * del sitemap siga siempre al dominio configurado (`site` en astro.config.mjs),
 * sin duplicar el dominio a mano. Permite todo salvo la ruta de API del lead.
 */
import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('sitemap-index.xml', site ?? 'https://www.bastinou.com').href;
  const body = ['User-agent: *', 'Allow: /', 'Disallow: /api/', '', `Sitemap: ${sitemap}`, ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
