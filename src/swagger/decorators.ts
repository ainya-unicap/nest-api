import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { BEARER_AUTH } from './swagger';

// Atalho para as rotas atrás do JwtAuthGuard: exige o Bearer e já documenta o 401.
export const ApiAuth = () =>
  applyDecorators(
    ApiBearerAuth(BEARER_AUTH),
    ApiUnauthorizedResponse({
      description: 'Token ausente, vazio ou inválido',
      schema: {
        type: 'object',
        properties: { error: { type: 'string', example: 'Token não enviado' } },
      },
    }),
  );

// Corpo de erro padrão da API (produzido pelo HttpErrorFilter).
export const errorSchema = (example: string) => ({
  type: 'object' as const,
  properties: { error: { type: 'string' as const, example } },
});
