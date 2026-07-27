/**
 * Listado de precios orientativos «desde» (especificación "Nuestros precios"
 * v1.0, julio 2026). Datos neutros de idioma: las etiquetas viven en i18n bajo
 * `prices.items.<id>`, las unidades bajo `prices.units.<unit>` y las categorías
 * bajo `prices.cats.<cat>`. Editar un precio = tocar SOLO este archivo.
 */

export type PriceUnit = 'm2' | 'punto' | 'conjunto' | 'estancia' | 'ud' | 'servicio' | 'ml';

export interface PriceItem {
  id: string;
  unit: PriceUnit;
  /** Precio «desde» en euros, sin IVA. */
  from: number;
}

/** Bloque principal: los 14 trabajos más solicitados, visibles de inmediato. */
export const mainPrices: PriceItem[] = [
  { id: 'pintura-paredes', unit: 'm2', from: 9 },
  { id: 'alisado-paredes', unit: 'm2', from: 18 },
  { id: 'suelo-laminado', unit: 'm2', from: 29 },
  { id: 'suelo-vinilico', unit: 'm2', from: 39 },
  { id: 'alicatado-paredes', unit: 'm2', from: 42 },
  { id: 'tabique-pladur', unit: 'm2', from: 49 },
  { id: 'punto-electrico', unit: 'punto', from: 75 },
  { id: 'punto-agua', unit: 'punto', from: 120 },
  { id: 'banera-ducha', unit: 'conjunto', from: 1290 },
  { id: 'reforma-bano', unit: 'estancia', from: 4900 },
  { id: 'reforma-cocina', unit: 'estancia', from: 7900 },
  { id: 'reforma-estetica', unit: 'm2', from: 180 },
  { id: 'reforma-integral', unit: 'm2', from: 590 },
  { id: 'reforma-local', unit: 'm2', from: 490 },
];

export interface PriceCategory {
  id: string;
  items: PriceItem[];
}

/** Listado completo, desplegado en accordion por categorías. */
export const priceCategories: PriceCategory[] = [
  {
    id: 'demoliciones',
    items: [
      { id: 'retirada-azulejos', unit: 'm2', from: 15 },
      { id: 'retirada-suelo-ceramico', unit: 'm2', from: 15 },
      { id: 'retirada-parquet', unit: 'm2', from: 8 },
      { id: 'demolicion-tabique-ladrillo', unit: 'm2', from: 25 },
      { id: 'demolicion-tabique-pladur', unit: 'm2', from: 15 },
      { id: 'desmontaje-cocina', unit: 'ud', from: 350 },
      { id: 'desmontaje-bano', unit: 'estancia', from: 490 },
      { id: 'retirada-escombros', unit: 'servicio', from: 350 },
    ],
  },
  {
    id: 'preparacion',
    items: [
      { id: 'nivelacion-paredes', unit: 'm2', from: 22 },
      { id: 'nivelacion-suelo', unit: 'm2', from: 18 },
      { id: 'pintura-color', unit: 'm2', from: 11 },
      { id: 'pintura-techos', unit: 'm2', from: 10 },
      { id: 'pintura-puertas', unit: 'ud', from: 95 },
    ],
  },
  {
    id: 'suelos',
    items: [
      { id: 'suelo-ceramico', unit: 'm2', from: 42 },
      { id: 'rodapie', unit: 'ml', from: 9 },
      { id: 'gres-porcelanico', unit: 'm2', from: 55 },
    ],
  },
  {
    id: 'pladur',
    items: [{ id: 'falso-techo', unit: 'm2', from: 45 }],
  },
  {
    id: 'electricidad',
    items: [
      { id: 'enchufe-interruptor', unit: 'ud', from: 45 },
      { id: 'luminaria', unit: 'ud', from: 35 },
      { id: 'cuadro-electrico', unit: 'ud', from: 650 },
    ],
  },
  {
    id: 'fontaneria',
    items: [
      { id: 'inodoro', unit: 'ud', from: 150 },
      { id: 'lavabo', unit: 'ud', from: 130 },
      { id: 'griferia', unit: 'ud', from: 80 },
      { id: 'plato-ducha', unit: 'ud', from: 650 },
    ],
  },
  {
    id: 'carpinteria',
    items: [
      { id: 'puerta-instalacion', unit: 'ud', from: 220 },
      { id: 'puerta-suministro', unit: 'ud', from: 390 },
    ],
  },
];

/** Formatea un importe en euros al estilo local (1.290 € / €1,290).
 *  Manual: Intl es-ES no separa los miles en cifras de 4 dígitos ("4900"),
 *  pero la especificación muestra «4.900 €». */
export function formatEuro(value: number, locale: 'es' | 'ca' | 'en'): string {
  const sep = locale === 'en' ? ',' : '.';
  const n = String(value).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return locale === 'en' ? `€${n}` : `${n} €`;
}
