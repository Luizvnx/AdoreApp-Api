import { Router } from 'express';
import { attendanceController } from './attendance.controller';
import { ensureRole } from '../../middlewares/ensureRole';

const attendanceRoutes = Router();

// Métricas de liderança
attendanceRoutes.get(
  '/metrics',
  ensureRole(['SUPER_ADMIN', 'ADMIN_WELCOME', 'GC_SUPERVISOR', 'GC_LEADER', 'WORSHIP_LEADER']),
  (req, res) => attendanceController.getMetrics(req, res)
);

// Lançamento de frequência
attendanceRoutes.get(
  '/',
  ensureRole(['SUPER_ADMIN', 'ADMIN_WELCOME', 'GC_SUPERVISOR', 'GC_LEADER', 'WORSHIP_LEADER']),
  (req, res) => attendanceController.listAttendance(req, res)
);

attendanceRoutes.post(
  '/',
  ensureRole(['SUPER_ADMIN', 'ADMIN_WELCOME', 'GC_SUPERVISOR', 'GC_LEADER', 'WORSHIP_LEADER']),
  (req, res) => attendanceController.createAttendance(req, res)
);

attendanceRoutes.delete(
  '/:id',
  ensureRole(['SUPER_ADMIN', 'ADMIN_WELCOME', 'GC_SUPERVISOR', 'GC_LEADER', 'WORSHIP_LEADER']),
  (req, res) => attendanceController.deleteAttendance(req, res)
);

export { attendanceRoutes };
