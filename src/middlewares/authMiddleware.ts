import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUserPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  roles: string[];
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
    // 1. Prioridade: Tenta obter o token via cookie HttpOnly 'token'
    let token = req.cookies?.token;

    // 2. Fallback secundário: Tenta obter via Header 'Authorization: Bearer <token>'
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      res.status(401).json({ error: 'Acesso negado. Token de autenticação ausente ou sessão finalizada.' });
      return;
    }

    // 3. Valida e decodifica o JWT
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    req.user = decoded;

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Sessão expirada. Por favor, faça login novamente.' });
      return;
    }
    res.status(401).json({ error: 'Token de autenticação inválido ou corrompido.' });
  }
}
