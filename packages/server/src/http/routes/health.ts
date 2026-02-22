import { Router, type Router as RouterType } from 'express';

const healthRouter: RouterType = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export { healthRouter };
