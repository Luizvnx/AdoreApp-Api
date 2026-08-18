import { Router } from 'express';
import { ConnectionGroupController } from './connection-groups.controller';

const connectionGroupRoutes = Router();
const controller = new ConnectionGroupController();

connectionGroupRoutes.get('/', (req, res) => controller.listGroups(req, res));
connectionGroupRoutes.post('/', (req, res) => controller.createGroup(req, res));
connectionGroupRoutes.put('/:id', (req, res) => controller.updateGroup(req, res));
connectionGroupRoutes.delete('/:id', (req, res) => controller.deleteGroup(req, res));

export { connectionGroupRoutes };
