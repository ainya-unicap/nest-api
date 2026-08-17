import 'reflect-metadata';
import express from 'express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';

// Importa o app Express existente da pasta api para reaproveitar rotas/serviços
// Import relativo para o código existente (API em TypeScript). O Vercel/@vercel/node
// irá compilar/transpilar os arquivos antes de executar.

const server = express();

// Inicializa Nest sobre a mesma instância Express — permite adicionar novos módulos
async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  // Após inicializar o Nest, monta o app legado. Assim as rotas do Nest terão precedência
  // e é possível migrar endpoints gradualmente para Nest sem conflito.
  // server.use('/', legacyApi);
}

bootstrap().catch((err) => {
  console.error('Nest bootstrap error:', err);
});

// Exporta o servidor Express compatível com @vercel/node (serverless handler espera export default)
export default server;
