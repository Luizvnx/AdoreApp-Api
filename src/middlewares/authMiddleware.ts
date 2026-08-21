import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { MESSAGES } from '../constants/messages';
import { handleApiError } from '../utils/errorHandler';

export interface AuthUserPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  roles: string[];
  congregationId?: string | null;
  connectionGroupId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export const JWT_SECRET = process.env.JWT_SECRET || 'adorehAppSecretKeyKey2026';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    let token: string | undefined = req.cookies?.token;
    let decoded: AuthUserPayload | null = null;
    let isExpired = false;

    // 1. Tenta validar o token vindo do Cookie HttpOnly
    if (token) {
      try {
        decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
      } catch (err: any) {
        if (err.name === 'TokenExpiredError') isExpired = true;
        token = undefined; // Cookie expirado ou inválido, desconsidera para tentar o header
      }
    }

    // 2. Se o cookie não existir ou for inválido, tenta o Header 'Authorization: Bearer <token>'
    if (!decoded && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const headerToken = parts[1];
        try {
          decoded = jwt.verify(headerToken, JWT_SECRET) as AuthUserPayload;
        } catch (err: any) {
          if (err.name === 'TokenExpiredError') isExpired = true;
        }
      }
    }

    if (!decoded) {
      if (isExpired) {
        res.status(401).json({ error: MESSAGES.ERRORS.UNAUTHORIZED });
        return;
      }
      res.status(401).json({ error: MESSAGES.ERRORS.ACCESS_DENIED });
      return;
    }

    // Suporte ao header x-override-role APENAS em ambiente de desenvolvimento/teste (Bloqueado em produção)
    const isDev = process.env.NODE_ENV !== 'production';
    const overrideRoleHeader = req.headers['x-override-role'];
    if (isDev && overrideRoleHeader && typeof overrideRoleHeader === 'string' && overrideRoleHeader.trim()) {
      const cleanOverride = overrideRoleHeader.trim();
      req.user = {
        ...decoded,
        role: cleanOverride,
        roles: [cleanOverride]
      };
    } else {
      req.user = decoded;
    }

    next();
  } catch (err: any) {
    handleApiError(res, err, MESSAGES.ERRORS.INVALID_TOKEN);
  }
}
