import { Router } from 'express';
import { visitorRoutes } from './modules/visitors/visitor.routes';

const routes = Router();

// Healthcheck
routes.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'api-adorehApp',
    timestamp: new Date().toISOString(),
  });
});

// Módulos da aplicação
routes.use('/visitors', visitorRoutes);

export { routes };
