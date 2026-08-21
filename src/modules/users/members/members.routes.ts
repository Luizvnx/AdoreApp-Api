import { Router } from 'express';
import { MembersController } from './members.controller';
import { ensureRole } from '../../../middlewares/ensureRole';

const memberRoutes = Router();
const controller = new MembersController();

// GET /members (Permite a visualização da membresia para todos os papéis autenticados)
memberRoutes.get('/', ensureRole(['SUPER_ADMIN', 'PASTOR', 'DIRECTOR', 'ADMIN_WELCOME', 'GC_SUPERVISOR', 'GC_LEADER', 'WORSHIP_LEADER', 'MEMBER']), controller.listMembers);

// POST /members (Cadastrar um novo membro)
memberRoutes.post('/', ensureRole(['SUPER_ADMIN', 'PASTOR', 'DIRECTOR', 'ADMIN_WELCOME', 'GC_SUPERVISOR']), controller.createMember);

// PUT /members/:id (A checagem de edição própria vs admin é feita internamente no controller)
memberRoutes.put('/:id', ensureRole(['SUPER_ADMIN', 'PASTOR', 'DIRECTOR', 'ADMIN_WELCOME', 'GC_SUPERVISOR', 'GC_LEADER', 'WORSHIP_LEADER', 'MEMBER']), controller.updateMember);

// DELETE /members/:id (Apenas SUPER_ADMIN, PASTOR e DIRECTOR)
memberRoutes.delete('/:id', ensureRole(['SUPER_ADMIN', 'PASTOR', 'DIRECTOR']), controller.deleteMember);

export { memberRoutes };
