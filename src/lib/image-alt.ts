/**
 * Alt de una foto de proyecto a partir de datos que ya existen: título
 * traducido, ubicación del frontmatter y fase (antes / después / foto de
 * galería). No inventa lo que se ve en la imagen.
 */
export function projectImageAlt(opts: {
  title: string;
  location: string;
  inWord: string;
  phase: string;
  photoWord?: string;
  photoIndex?: number;
}): string {
  const place = `${opts.title} ${opts.inWord} ${opts.location}, ${opts.phase}`;
  if (opts.photoWord && opts.photoIndex && opts.photoIndex > 0) {
    return `${place}, ${opts.photoWord} ${opts.photoIndex}`;
  }
  return place;
}
