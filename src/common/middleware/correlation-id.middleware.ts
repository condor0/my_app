/**
 * CORRELATION ID MIDDLEWARE
 * Generates and propagates correlation IDs across microservices
 * Enables request tracing through the entire system
 *
 * Headers:
 * - x-request-id: Unique request identifier (created if not present)
 * - x-correlation-id: Parent request ID for request chains
 * - x-trace-id: Full trace path for debugging
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  constructor(private readonly logger: PinoLogger) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Generate or use provided request ID
    const requestId = req.header('x-request-id') || uuidv4();

    // Get parent correlation ID (for request chains)
    const correlationId =
      req.header('x-correlation-id') || req.header('x-request-id') || uuidv4();

    // Build trace path for debugging
    const traceId = req.header('x-trace-id') || `${requestId}`;
    const serviceName = process.env.SERVICE_NAME || 'unknown';
    const newTraceId = `${traceId} -> ${serviceName}`;

    // Store in request object for access in controllers/services
    (req as any).requestId = requestId;
    (req as any).correlationId = correlationId;
    (req as any).traceId = newTraceId;

    // Add headers to response
    res.set('x-request-id', requestId);
    res.set('x-correlation-id', correlationId);
    res.set('x-trace-id', newTraceId);

    // Log request with correlation context
    const logObj = {
      requestId,
      correlationId,
      traceId: newTraceId,
      method: req.method,
      url: req.originalUrl,
      service: serviceName,
      timestamp: new Date().toISOString(),
    };

    // Optionally log at request start
    if (req.method !== 'OPTIONS') {
      this.logger.debug(logObj, 'Request correlation context established');
    }

    next();
  }
}

/**
 * Get correlation headers to propagate to microservice calls
 * Use in gateway when forwarding requests to microservices
 */
export function getCorrelationHeaders(req: any): Record<string, string> {
  const serviceName = process.env.SERVICE_NAME || 'unknown';
  const requestId = req.requestId || uuidv4();
  const correlationId = req.correlationId || req.requestId || uuidv4();
  const traceId = req.traceId ? `${req.traceId} -> ${serviceName}` : uuidv4();

  return {
    'x-request-id': requestId,
    'x-correlation-id': correlationId,
    'x-trace-id': traceId,
  };
}
