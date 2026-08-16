/**
 * Colección de proyectos del portfolio (CLAUDE.pdf §11: editable sin programar).
 * El frontmatter es neutro de idioma (imágenes, tipo, m², año, segmento); el
 * texto localizado (título, resumen, duración) vive en i18n bajo `projects.<id>`.
 * Añadir un proyecto = añadir un .md aquí + su bloque en los diccionarios.
 */
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      type: z.enum(['vivienda', 'comercial']),
      area: z.number(),
      year: z.number(),
      segment: z.enum(['basico', 'estandar', 'premium']),
      location: z.string(),
      featured: z.boolean().default(false),
      order: z.number().default(0),
      cover: image(),
      gallery: z.array(image()),
      beforeAfter: z
        .array(z.object({ before: image(), after: image() }))
        .default([]),
    }),
});

/**
 * Guías (contenido editorial que empuja a las páginas de dinero). A diferencia de
 * `projects`, aquí el texto SÍ vive en el .md porque cada guía es un artículo
 * completo: hay un archivo por idioma y `translationKey` une las tres versiones
 * (igual que el mapa de rutas une las páginas). `moneyPage` es la RouteKey a la
 * que empuja la guía y `related` lista translationKeys de otras guías.
 */
const guias = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guias' }),
  schema: ({ image }) =>
    z.object({
      lang: z.enum(['es', 'ca', 'en']),
      translationKey: z.string(),
      title: z.string(),
      metaTitle: z.string(),
      metaDescription: z.string(),
      excerpt: z.string(),
      keyword: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      cover: image(),
      coverAlt: z.string(),
      readingMinutes: z.number(),
      faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
      moneyPage: z.string(),
      related: z.array(z.string()).default([]),
      order: z.number().default(0),
    }),
});

export const collections = { projects, guias };
