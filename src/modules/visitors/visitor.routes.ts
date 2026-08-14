import { Router } from 'express';
import { visitorController } from './visitor.controller';

const visitorRoutes = Router();

visitorRoutes.post('/', (req, res) => visitorController.create(req, res));
visitorRoutes.get('/', (req, res) => visitorController.findAll(req, res));
visitorRoutes.get('/:id', (req, res) => visitorController.findById(req, res));
visitorRoutes.put('/:id', (req, res) => visitorController.update(req, res));
visitorRoutes.delete('/:id', (req, res) => visitorController.delete(req, res));

export { visitorRoutes };
