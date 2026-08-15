import swaggerJsdoc from 'swagger-jsdoc';
import schemas from './schemas.js';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: { title: 'API', version: '1.0.0' },
  servers: [{ url: '/' }],
};

export const swaggerSpec = swaggerJsdoc({ swaggerDefinition, apis: [] });

// Merge schemas if available
try {
  swaggerSpec.components = swaggerSpec.components ?? { schemas: {} };
  Object.assign(swaggerSpec.components.schemas, schemas ?? {});
} catch (err) {
  // ignore
}

export default swaggerSpec;
