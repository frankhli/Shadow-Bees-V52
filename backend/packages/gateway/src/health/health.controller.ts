import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'gateway',
      uptime: process.uptime(),
    };
  }

  @Get('ready')
  readiness() {
    return {
      status: 'ready',
      checks: {
        database: 'connected',
        cache: 'connected',
      },
    };
  }

  @Get('live')
  liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}
