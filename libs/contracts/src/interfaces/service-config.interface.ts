// ============================================================================
// SERVICE CONFIGURATION INTERFACES
// Defines connection settings for microservices
// ============================================================================

import { Transport } from '@nestjs/microservices';

/**
 * TCP Transport configuration for a microservice
 */
export interface TcpServiceConfig {
  transport: typeof Transport.TCP;
  options: {
    host: string;
    port: number;
  };
}

/**
 * Service discovery configuration
 * In production, this would typically come from service registry (Consul, etcd)
 */
export const SERVICES = {
  AUTH: {
    name: 'AUTH_SERVICE',
    host: process.env.AUTH_SERVICE_HOST || 'localhost',
    port: parseInt(process.env.AUTH_SERVICE_PORT || '3001', 10),
  },
  EVENTS: {
    name: 'EVENTS_SERVICE',
    host: process.env.EVENTS_SERVICE_HOST || 'localhost',
    port: parseInt(process.env.EVENTS_SERVICE_PORT || '3002', 10),
  },
  GATEWAY: {
    name: 'API_GATEWAY',
    host: process.env.GATEWAY_HOST || 'localhost',
    port: parseInt(process.env.GATEWAY_PORT || '3000', 10),
  },
} as const;

/**
 * Service names for dependency injection tokens
 */
export const SERVICE_TOKENS = {
  AUTH_SERVICE: 'AUTH_SERVICE',
  EVENTS_SERVICE: 'EVENTS_SERVICE',
} as const;
