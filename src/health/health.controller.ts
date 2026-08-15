import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('hello')
  hello() {
    return { message: 'Hello Vercel 🚀' };
  }
}
