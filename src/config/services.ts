/**
 * Configuración de los servicios (no traducible). Mapea cada servicio con su
 * ruta, el tipo de tarifa en pricing.json y el orden. El contenido traducido
 * vive en los diccionarios i18n bajo `landings.<servicio>`.
 *
 * Servicios (concepto 2026): Viviendas · Oficinas · Tiendas · Beauty & fitness.
 */
import type { RouteKey } from '../i18n/routes';

export type ServiceKey = 'viviendas' | 'oficinas' | 'tiendas' | 'beauty' | 'banos';

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
}

export const services: Record<ServiceKey, ServiceCfg> = {
  viviendas: { routeKey: 'viviendas', pricingType: 'piso' },
  oficinas: { routeKey: 'oficinas', pricingType: 'oficina' },
  tiendas: { routeKey: 'tiendas', pricingType: 'oficina' },
  beauty: { routeKey: 'beauty', pricingType: 'oficina' },
  banos: { routeKey: 'banos', pricingType: null, partialPricing: 'bano' },
};

/** Orden del desplegable de Servicios: las cuatro verticales y luego baños. */
export const serviceOrder: ServiceKey[] = ['viviendas', 'oficinas', 'tiendas', 'beauty', 'banos'];
