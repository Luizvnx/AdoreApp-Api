import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { MESSAGES } from '../constants/messages';

export const ensureRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Obtém a role autenticada de forma segura do JWT injetado pelo authMiddleware
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: MESSAGES.ERRORS.UNAUTHORIZED });
      return;
    }

    const userRoles = user.roles || [user.role];
    const hasRole = userRoles.some((r) => allowedRoles.includes(r as Role) || r === 'SUPER_ADMIN');

    if (!hasRole) {
      res.status(403).json({ error: MESSAGES.ERRORS.INSUFFICIENT_PERMISSIONS });
      return;
    }

    next();
  };
};
