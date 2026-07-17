/**
 * Motor de cálculo de la calculadora (CLAUDE.pdf §5.2). Toda la lógica de
 * precios vive en pricing.json. Función pura, sin dependencias de React.
 *
 * Integral: m² × tarifa(tipo, segmento).
 * Parcial: suma de partidas (fijas o por m² según partida).
 * Resultado: horquilla ±horquilla (config), redondeada a centenas.
 * Nunca se muestra una cifra exacta única (siempre un rango).
 */
import pricing from '../config/pricing.json';

export type Tipo = 'piso' | 'casa' | 'oficina' | 'otro';
export type Obra = 'integral' | 'parcial';
export type Segmento = 'basico' | 'estandar' | 'premium';
export type Parte = 'cocina' | 'bano' | 'pintura' | 'suelos' | 'electricidad' | 'fontaneria';

export const partes: Parte[] = ['cocina', 'bano', 'pintura', 'suelos', 'electricidad', 'fontaneria'];
export const segmentos: Segmento[] = ['basico', 'estandar', 'premium'];
export const tipos: Tipo[] = ['piso', 'casa', 'oficina', 'otro'];

export interface CalcInput {
  tipo: Tipo;
  obra: Obra;
  parts: Parte[];
  m2: number;
  segmento: Segmento;
}

export interface CalcResult {
  min: number;
  max: number;
  perSqm: number;
  base: number;
  valid: boolean;
}

const roundHundreds = (n: number): number => Math.round(n / 100) * 100;

/** 'otro' no tiene tarifa propia → se estima con la de piso. */
const rateKey = (t: Tipo): 'piso' | 'casa' | 'oficina' => (t === 'otro' ? 'piso' : t);

type SegMap = Record<Segmento, number>;
const parcial = pricing.parcial as Record<string, SegMap>;
const integral = pricing.integral as Record<string, SegMap>;

export function estimate(input: CalcInput): CalcResult {
  const { tipo, obra, parts, m2, segmento } = input;
  const horquilla = pricing.horquilla ?? 0.15;
  let base = 0;

  if (obra === 'integral') {
    base = (integral[rateKey(tipo)]?.[segmento] ?? 0) * m2;
  } else {
    for (const part of parts) {
      switch (part) {
        case 'cocina':
          base += parcial.cocina[segmento];
          break;
        case 'bano':
          base += parcial.bano[segmento];
          break;
        case 'pintura':
          base += parcial.pintura_m2[segmento] * m2;
          break;
        case 'suelos':
          base += parcial.suelos_m2[segmento] * m2;
          break;
        case 'electricidad':
          base += parcial.electricidad_m2[segmento] * m2;
          break;
        case 'fontaneria':
          base += parcial.fontaneria_m2[segmento] * m2;
          break;
      }
    }
  }

  const valid = base > 0 && m2 > 0;
  return {
    min: roundHundreds(base * (1 - horquilla)),
    max: roundHundreds(base * (1 + horquilla)),
    perSqm: m2 > 0 ? Math.round(base / m2) : 0,
    base,
    valid,
  };
}
