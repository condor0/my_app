import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const id = req.header('x-request-id') || uuidv4();
    req['requestId'] = id; // Store for the interceptor
    res.set('x-request-id', id); // Return to client in headers
    next();
  }
}