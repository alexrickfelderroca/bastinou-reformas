/**
 * Configuración de los servicios (no traducible). Mapea cada servicio con su
 * ruta, el tipo de tarifa en pricing.json y el orden. El contenido traducido
 * vive en los diccionarios i18n bajo `landings.<servicio>`.
 *
 * Servicios (concepto 2026): Viviendas · Oficinas · Tiendas · Beauty & fitness.
 */
import type { RouteKey } from '../i18n/routes';

export type ServiceKey = 'viviendas' | 'oficinas' | 'tiendas' | 'beauty';

/** Tipo de tarifa integral en pricing.json; null = presupuesto a medida. */
export type PricingType = 'piso' | 'casa' | 'oficina' | null;

export interface ServiceCfg {
  routeKey: RouteKey;
  pricingType: PricingType;
}

export const services: Record<ServiceKey, ServiceCfg> = {
  viviendas: { routeKey: 'viviendas', pricingType: 'piso' },
  oficinas: { routeKey: 'oficinas', pricingType: 'oficina' },
  tiendas: { routeKey: 'tiendas', pricingType: 'oficina' },
  beauty: { routeKey: 'beauty', pricingType: 'oficina' },
};

export const serviceOrder: ServiceKey[] = ['viviendas', 'oficinas', 'tiendas', 'beauty'];
