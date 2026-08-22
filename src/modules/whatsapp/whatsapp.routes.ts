import { Router } from 'express';
import { WhatsAppController } from './whatsapp.controller';
import { ensureRole } from '../../middlewares/ensureRole';
import { Role } from '@prisma/client';

const whatsAppRoutes = Router();
const controller = new WhatsAppController();

const allowedRoles: Role[] = ['SUPER_ADMIN', 'PASTOR', 'DIRECTOR', 'ADMIN_WELCOME', 'GC_SUPERVISOR'];

whatsAppRoutes.get('/status', ensureRole(allowedRoles), (req, res) => controller.getStatus(req, res));
whatsAppRoutes.get('/qrcode', ensureRole(allowedRoles), (req, res) => controller.getQRCode(req, res));
whatsAppRoutes.post('/disconnect', ensureRole(allowedRoles), (req, res) => controller.disconnect(req, res));
whatsAppRoutes.get('/template', ensureRole(allowedRoles), (req, res) => controller.getTemplate(req, res));
whatsAppRoutes.put('/template', ensureRole(allowedRoles), (req, res) => controller.updateTemplate(req, res));
whatsAppRoutes.post('/send-test', ensureRole(allowedRoles), (req, res) => controller.sendTestMessage(req, res));

export { whatsAppRoutes };
