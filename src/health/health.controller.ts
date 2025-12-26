import { Controller, Get } from '@nestjs/common';

@Controller('health') // This sets the route to /health
export class HealthController {
  @Get() // Listens for GET requests
  check() {
    // Returning an object automatically sends a 200 OK with JSON
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
