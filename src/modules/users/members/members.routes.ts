import { Router } from 'express';
import { MembersController } from './members.controller';
import { ensureRole } from '../../../middlewares/ensureRole';

const memberRoutes = Router();
const controller = new MembersController();

// GET /members (SUPER_ADMIN, GC_LEADER, ADMIN_WELCOME dependendo da necessidade, aqui deixamos mais aberto para liderança)
memberRoutes.get('/', ensureRole(['SUPER_ADMIN', 'GC_LEADER', 'ADMIN_WELCOME']), controller.listMembers);

// PUT /members/:id
memberRoutes.put('/:id', ensureRole(['SUPER_ADMIN', 'MEMBER']), controller.updateMember);

export { memberRoutes };
