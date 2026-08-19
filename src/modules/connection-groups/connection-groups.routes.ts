import { Router } from 'express';
import { ConnectionGroupController } from './connection-groups.controller';
import { ensureRole } from '../../middlewares/ensureRole';

const connectionGroupRoutes = Router();
const controller = new ConnectionGroupController();

connectionGroupRoutes.get('/', (req, res) => controller.listGroups(req, res));
connectionGroupRoutes.post('/', ensureRole(['SUPER_ADMIN', 'GC_SUPERVISOR', 'GC_LEADER']), (req, res) => controller.createGroup(req, res));
connectionGroupRoutes.put('/:id', ensureRole(['SUPER_ADMIN', 'GC_SUPERVISOR', 'GC_LEADER']), (req, res) => controller.updateGroup(req, res));
connectionGroupRoutes.delete('/:id', ensureRole(['SUPER_ADMIN', 'GC_SUPERVISOR', 'GC_LEADER']), (req, res) => controller.deleteGroup(req, res));

export { connectionGroupRoutes };
