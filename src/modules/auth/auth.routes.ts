import { Router } from 'express';
import { AuthController } from './auth.controller';
import { loginRateLimiter, loginStrictLockoutLimiter } from '../../middlewares/rateLimiter';
import { authMiddleware } from '../../middlewares/authMiddleware';

const authRoutes = Router();
const controller = new AuthController();

authRoutes.post(
  '/login',
  loginStrictLockoutLimiter,
  loginRateLimiter,
  (req, res) => controller.login(req, res)
);

authRoutes.get(
  '/me',
  authMiddleware,
  (req, res) => controller.me(req, res)
);

authRoutes.post(
  '/logout',
  authMiddleware,
  (req, res) => controller.logout(req, res)
);

export { authRoutes };
