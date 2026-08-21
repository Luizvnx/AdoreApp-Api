import { Router } from 'express';
import { CongregationController } from './congregation.controller';

const congregationRoutes = Router();
const controller = new CongregationController();

congregationRoutes.get('/', (req, res) => controller.list(req, res));
congregationRoutes.get('/dashboard-report', (req, res) => controller.getDashboardReport(req, res));
congregationRoutes.get('/:id', (req, res) => controller.getById(req, res));
congregationRoutes.post('/', (req, res) => controller.create(req, res));
congregationRoutes.put('/:id', (req, res) => controller.update(req, res));
congregationRoutes.delete('/:id', (req, res) => controller.delete(req, res));

export { congregationRoutes };
