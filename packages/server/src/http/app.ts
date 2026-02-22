import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { healthRouter } from './routes/health.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(): express.Express {
  const app = express();

  // API routes
  app.use('/api', healthRouter);

  // Serve client build (in production the client dist sits at packages/client/dist)
  const clientDist = path.resolve(__dirname, '../../../client/dist');
  app.use(express.static(clientDist));

  // SPA fallback — serve index.html for all non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  return app;
}
