import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marca uma rota como aberta, dispensando o JwtAuthGuard global.
// Equivale a não passar por requireAuth no projeto original.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
