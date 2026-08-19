import { Router } from 'express';
import { MembersController } from './members.controller';
import { ensureRole } from '../../../middlewares/ensureRole';

const memberRoutes = Router();
const controller = new MembersController();

// GET /members (Permite a visualização da membresia para todos os papéis autenticados)
memberRoutes.get('/', ensureRole(['SUPER_ADMIN', 'ADMIN_WELCOME', 'GC_SUPERVISOR', 'GC_LEADER', 'WORSHIP_LEADER', 'MEMBER']), controller.listMembers);

// PUT /members/:id (A checagem de edição própria vs admin é feita internamente no controller)
memberRoutes.put('/:id', ensureRole(['SUPER_ADMIN', 'ADMIN_WELCOME', 'GC_SUPERVISOR', 'GC_LEADER', 'WORSHIP_LEADER', 'MEMBER']), controller.updateMember);

export { memberRoutes };
