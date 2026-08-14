import { Router } from 'express';
import { visitorController } from './visitor.controller';
import { MembersController } from '../users/members/members.controller';
import { ensureRole } from '../../middlewares/ensureRole';

const visitorRoutes = Router();
const membersCtrl = new MembersController();

visitorRoutes.post('/', ensureRole(['SUPER_ADMIN', 'ADMIN_WELCOME']), (req, res) => visitorController.create(req, res));
visitorRoutes.get('/', ensureRole(['SUPER_ADMIN', 'ADMIN_WELCOME', 'GC_LEADER']), (req, res) => visitorController.findAll(req, res));
visitorRoutes.get('/:id', ensureRole(['SUPER_ADMIN', 'ADMIN_WELCOME', 'GC_LEADER']), (req, res) => visitorController.findById(req, res));
visitorRoutes.put('/:id', ensureRole(['SUPER_ADMIN', 'ADMIN_WELCOME']), (req, res) => visitorController.update(req, res));
visitorRoutes.delete('/:id', ensureRole(['SUPER_ADMIN', 'ADMIN_WELCOME']), (req, res) => visitorController.delete(req, res));

// Conversão
visitorRoutes.put('/:id/convert', ensureRole(['SUPER_ADMIN', 'ADMIN_WELCOME']), (req, res) => membersCtrl.convertVisitorToMember(req, res));

export { visitorRoutes };
