import { Router } from 'express';
import { visitorRoutes } from './modules/visitors/visitor.routes';
import { memberRoutes } from './modules/users/members/members.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { authMiddleware } from './middlewares/authMiddleware';

const routes = Router();

// Healthcheck (Público)
routes.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'api-adorehApp',
    timestamp: new Date().toISOString(),
  });
});

// Módulos da aplicação
routes.use('/auth', authRoutes);
routes.use('/visitors', authMiddleware, visitorRoutes);
routes.use('/members', authMiddleware, memberRoutes);

export { routes };
