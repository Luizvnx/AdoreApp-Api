import { Router } from 'express';
import { visitorRoutes } from './modules/visitors/visitor.routes';
import { memberRoutes } from './modules/users/members/members.routes';
import { ministryRoutes } from './modules/ministries/ministries.routes';
import { connectionGroupRoutes } from './modules/connection-groups/connection-groups.routes';
import { attendanceRoutes } from './modules/attendance/attendance.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { financeRoutes } from './modules/finance/finance.routes';
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
routes.use('/ministries', authMiddleware, ministryRoutes);
routes.use('/connection-groups', authMiddleware, connectionGroupRoutes);
routes.use('/attendance', authMiddleware, attendanceRoutes);
routes.use('/finance', authMiddleware, financeRoutes);

export { routes };
