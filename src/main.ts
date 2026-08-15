import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger/index.js';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  // Body parsers e CORS
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Swagger (reaproveita swaggerSpec do projeto original)
  const swaggerUiOptions = {
    customCssUrl: 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css',
    customJs: [
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js',
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js',
    ],
  };

  app.use('/api/docs', swaggerUi.serveFiles(swaggerSpec, swaggerUiOptions), swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  app.getHttpAdapter()?.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

  const port = process.env.PORT || 3000;

  // Em Vercel o listen não deve rodar — manter mesmo comportamento do projeto original
  if (!process.env.VERCEL) {
    await app.listen(port);
    console.log(`Server is running in http://localhost:${port}`);
  }
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap Nest application', err);
  process.exit(1);
});
