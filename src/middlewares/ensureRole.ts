import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

export const ensureRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Para simplificar o MVP, vamos checar as roles enviadas via header
    const userRole = req.headers['x-user-role'] as string;

    if (!userRole) {
      res.status(401).json({ error: 'Acesso negado: Perfil não informado.' });
      return;
    }

    if (!allowedRoles.includes(userRole as Role) && userRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Acesso negado: Sem permissão para esta ação.' });
      return;
    }

    next();
  };
};
