import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Health check endpoint',
    description:
      'Verifica as dependências do serviço (PostgreSQL, MinIO e Redis). ' +
      'PostgreSQL fora do ar responde 503 (unhealthy); MinIO ou Redis fora respondem 200 com status "degraded", ' +
      'porque leitura de catálogo e chat continuam funcionando — degradação não deve reiniciar o container.',
  })
  @ApiResponse({ status: 200, description: 'Aplicação saudável ou degradada' })
  @ApiResponse({ status: 503, description: 'Dependência crítica indisponível' })
  async check(@Res() res: Response) {
    const report = await this.healthService.check();

    // 503 apenas quando uma dependência crítica caiu: é esse código que faz o
    // healthcheck do container falhar e o proxy tirar a instância do ar.
    const httpStatus = report.status === 'unhealthy' ? 503 : 200;

    return res.status(httpStatus).json(report);
  }
}
