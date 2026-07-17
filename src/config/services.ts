/**
 * Configuración de los servicios (no traducible). Mapea cada servicio con su
 * ruta, el tipo de tarifa en pricing.json y el orden. El contenido traducido
 * vive en los diccionarios i18n bajo `landings.<servicio>`.
 */
import type { RouteKey } from '../i18n/routes';

export type ServiceKey = 'pisos' | 'casas' | 'oficinas' | 'construccion';

/** Tipo de tarifa integral en pricing.json; null = presupuesto a medida. */
export type PricingType = 'piso' | 'casa' | 'oficina' | null;

export interface ServiceCfg {
  routeKey: RouteKey;
  pricingType: PricingType;
}

export const services: Record<ServiceKey, ServiceCfg> = {
  pisos: { routeKey: 'pisos', pricingType: 'piso' },
  casas: { routeKey: 'casas', pricingType: 'casa' },
  oficinas: { routeKey: 'oficinas', pricingType: 'oficina' },
  construccion: { routeKey: 'construccion', pricingType: null },
};

export const serviceOrder: ServiceKey[] = ['pisos', 'casas', 'oficinas', 'construccion'];
