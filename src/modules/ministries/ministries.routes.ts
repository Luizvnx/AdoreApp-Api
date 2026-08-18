import { Router } from 'express';
import { MinistryController } from './ministries.controller';

const ministryRoutes = Router();
const controller = new MinistryController();

ministryRoutes.get('/', (req, res) => controller.listMinistries(req, res));
ministryRoutes.post('/', (req, res) => controller.createMinistry(req, res));
ministryRoutes.delete('/:id', (req, res) => controller.deleteMinistry(req, res));

export { ministryRoutes };
