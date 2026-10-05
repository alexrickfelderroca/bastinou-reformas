/**
 * Configuración de los servicios (no traducible). Mapea cada servicio con su
 * ruta, el tipo de tarifa en pricing.json y el orden. El contenido traducido
 * vive en los diccionarios i18n bajo `landings.<servicio>`.
 *
 * Servicios: integrales, viviendas, cocinas, baños, oficinas, tiendas y beauty.
 */
import type { RouteKey } from '../i18n/routes';

export type ServiceKey =
  | 'integrales'
  | 'santCugat'
  | 'viviendas'
  | 'cocinas'
  | 'oficinas'
  | 'tiendas'
  | 'beauty'
  | 'banos';

/** Tipo de tarifa integral en pricing.json; null = presupuesto a medida. */
export type PricingType = 'piso' | 'casa' | 'oficina' | null;

/**
 * Tarifa de reforma PARCIAL en pricing.json (`parcial.*`). A diferencia de la
 * integral, es un precio total «desde» por reforma, no un €/m²: un baño no se
 * presupuesta por metros. Cuando está presente manda sobre `pricingType`.
 */
export type PartialPricingKey = 'bano' | 'cocina';

export interface ServiceCfg {
  routeKey: RouteKey;
  pricingType: PricingType;
  partialPricing?: PartialPricingKey;
  /** Zona del JSON-LD Service. Si falta, se usa la zona general del sitio. */
  areaServed?: readonly string[];
}

export const services: Record<ServiceKey, ServiceCfg> = {
  integrales: { routeKey: 'integrales', pricingType: 'piso' },
  santCugat: {
    routeKey: 'santCugat',
    pricingType: 'piso',
    areaServed: ['Sant Cugat del Vallès'],
  },
  viviendas: { routeKey: 'viviendas', pricingType: 'piso' },
  cocinas: { routeKey: 'cocinas', pricingType: null, partialPricing: 'cocina' },
  oficinas: { routeKey: 'oficinas', pricingType: 'oficina' },
  tiendas: { routeKey: 'tiendas', pricingType: 'oficina' },
  beauty: { routeKey: 'beauty', pricingType: 'oficina' },
  banos: { routeKey: 'banos', pricingType: null, partialPricing: 'bano' },
};

/** Orden del desplegable de Servicios y del pie. */
export const serviceOrder: ServiceKey[] = [
  'integrales',
  'santCugat',
  'viviendas',
  'cocinas',
  'banos',
  'oficinas',
  'tiendas',
  'beauty',
];
