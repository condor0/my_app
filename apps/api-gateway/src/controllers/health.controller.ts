// HEALTH CONTROLLER (Gateway)
// Health check endpoints for monitoring and load balancers.

import { Controller, Get, Inject, InjectionToken } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SERVICE_TOKENS } from '@libscontracts';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(SERVICE_TOKENS.AUTH_SERVICE as InjectionToken)
    private readonly authClient: ClientProxy,
    @Inject(SERVICE_TOKENS.EVENTS_SERVICE as InjectionToken)
    private readonly eventsClient: ClientProxy,
  ) {}

  /**
   * Basic health check
   */
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @Get()
  health(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Detailed health check with service status
   */
  @ApiOperation({ summary: 'Detailed health check with service status' })
  @ApiResponse({ status: 200, description: 'Health status of all services' })
  @Get('detailed')
  async detailedHealth(): Promise<{
    status: string;
    timestamp: string;
    services: Record<string, { status: string; latency?: number }>;
  }> {
    const services: Record<string, { status: string; latency?: number }> = {};

    // Check Auth Service
    const authStart = Date.now();
    try {
      await this.authClient.connect();
      services.auth = { status: 'healthy', latency: Date.now() - authStart };
    } catch {
      services.auth = { status: 'unhealthy' };
    }

    // Check Events Service
    const eventsStart = Date.now();
    try {
      await this.eventsClient.connect();
      services.events = {
        status: 'healthy',
        latency: Date.now() - eventsStart,
      };
    } catch {
      services.events = { status: 'unhealthy' };
    }

    const allHealthy = Object.values(services).every(
      (s) => s.status === 'healthy',
    );

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services,
    };
  }
}
