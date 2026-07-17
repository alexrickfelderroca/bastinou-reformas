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
      type: z.enum(['piso', 'casa', 'oficina', 'construccion']),
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

export const collections = { projects };
