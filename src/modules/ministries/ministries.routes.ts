import { Router } from 'express';
import { MinistryController } from './ministries.controller';
import { ensureRole } from '../../middlewares/ensureRole';

const ministryRoutes = Router();
const controller = new MinistryController();

ministryRoutes.get('/', (req, res) => controller.listMinistries(req, res));
ministryRoutes.post('/', ensureRole(['SUPER_ADMIN', 'WORSHIP_LEADER']), (req, res) => controller.createMinistry(req, res));
ministryRoutes.delete('/:id', ensureRole(['SUPER_ADMIN', 'WORSHIP_LEADER']), (req, res) => controller.deleteMinistry(req, res));

export { ministryRoutes };
