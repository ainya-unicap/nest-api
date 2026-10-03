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
// `error` sempre vem; `codigo` e `campos` aparecem quando a API consegue
// apontar exatamente o que está errado.
export const errorSchema = (example: string, codigo?: string) => ({
  type: 'object' as const,
  properties: {
    error: { type: 'string' as const, example },
    codigo: {
      type: 'string' as const,
      description: 'Código estável para o front tratar sem depender do texto',
      ...(codigo ? { example: codigo } : {}),
    },
    campos: {
      type: 'object' as const,
      nullable: true,
      description: 'Presente em erro de validação: o problema de cada campo',
      additionalProperties: { type: 'string' as const },
    },
  },
});

// Erro de validação por campo, com exemplo preenchido.
export const erroDeValidacaoSchema = (campos: Record<string, string>, codigo = 'VALIDACAO') => ({
  type: 'object' as const,
  properties: {
    error: {
      type: 'string' as const,
      example: Object.entries(campos).map(([c, p]) => `${c}: ${p}`).join('; '),
    },
    codigo: { type: 'string' as const, example: codigo },
    campos: {
      type: 'object' as const,
      additionalProperties: { type: 'string' as const },
      example: campos,
    },
  },
});
