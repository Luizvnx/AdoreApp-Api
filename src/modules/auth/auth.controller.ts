import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../../middlewares/authMiddleware';
import { clearLoginAttempts } from '../../middlewares/rateLimiter';
import { MESSAGES } from '../../constants/messages';
import { handleApiError } from '../../utils/errorHandler';

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        res.status(400).json({ error: MESSAGES.ERRORS.INVALID_CREDENTIALS });
        return;
      }

      const cleanEmail = email.trim().toLowerCase();

      // 1. Buscar usuário cadastrado pelo e-mail com parameterized Prisma query
      const user = await prisma.user.findUnique({
        where: { email: cleanEmail },
        include: {
          memberProfile: true,
          connectionGroup: {
            select: {
              id: true,
              name: true,
              neighborhood: true,
              meetingDay: true,
              meetingTime: true,
              leader: { select: { fullName: true } }
            }
          }
        }
      });

      // 2. Se o usuário não existir no banco
      if (!user) {
        res.status(401).json({ error: MESSAGES.ERRORS.INVALID_CREDENTIALS });
        return;
      }

      // 3. Verificar se o usuário está ativo
      if (!user.isActive) {
        res.status(401).json({ error: MESSAGES.ERRORS.ACCOUNT_DISABLED });
        return;
      }

      // 4. Verificar senha criptografada com bcrypt
      let isPasswordValid = false;

      if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
        isPasswordValid = await bcrypt.compare(password, user.password);
      } else {
        if (user.password === password) {
          isPasswordValid = true;
          const hashed = await bcrypt.hash(password, 10);
          await prisma.user.update({
            where: { id: user.id },
            data: { password: hashed }
          });
        }
      }

      if (!isPasswordValid) {
        res.status(401).json({ error: MESSAGES.ERRORS.INVALID_CREDENTIALS });
        return;
      }

      // Limpa contador de tentativas do rate limiter após login bem-sucedido
      clearLoginAttempts(req);

      const primaryRole = user.roles[0] || 'MEMBER';

      // 5. Gerar token JWT assinado digitalmente
      const tokenPayload = {
        id: user.id,
        email: user.email,
        name: user.fullName,
        role: primaryRole,
        roles: user.roles,
        connectionGroupId: user.connectionGroupId
      };

      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

      // Detecta se a conexão é HTTPS (direta ou via proxy do Railway)
      const isHttps = process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https';

      // 6. Armazenar o token em Cookie HttpOnly e Secure no navegador do cliente
      res.cookie('token', token, {
        httpOnly: true,
        secure: isHttps,
        sameSite: isHttps ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
      });

      // 7. Retornar resposta ao cliente
      res.json({
        message: 'Login realizado com sucesso.',
        token,
        user: {
          id: user.id,
          name: user.fullName,
          email: user.email,
          role: primaryRole,
          roles: user.roles,
          connectionGroupId: user.connectionGroupId,
          connectionGroup: user.connectionGroup,
          memberProfile: user.memberProfile
        }
      });
    } catch (error) {
      handleApiError(res, error, MESSAGES.ERRORS.INTERNAL_SERVER_ERROR);
    }
  }

  // Obter perfil do usuário logado via validação do Cookie HttpOnly ou Header Bearer
  async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: MESSAGES.ERRORS.UNAUTHORIZED });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          fullName: true,
          email: true,
          roles: true,
          isActive: true,
          connectionGroupId: true,
          connectionGroup: {
            select: {
              id: true,
              name: true,
              neighborhood: true,
              meetingDay: true,
              meetingTime: true,
              leader: { select: { fullName: true } }
            }
          },
          memberProfile: {
            select: {
              phone: true,
              address: true,
              zipCode: true,
              neighborhood: true,
              birthDate: true,
              joinDate: true,
              baptismDate: true,
              maritalStatus: true,
              ministries: true,
            }
          }
        }
      });

      if (!user || !user.isActive) {
        res.status(401).json({ error: MESSAGES.ERRORS.USER_NOT_FOUND });
        return;
      }

      res.json({
        user: {
          id: user.id,
          name: user.fullName,
          email: user.email,
          role: user.roles[0] || 'MEMBER',
          roles: user.roles,
          connectionGroupId: user.connectionGroupId,
          connectionGroup: user.connectionGroup,
          memberProfile: user.memberProfile
        }
      });
    } catch (error) {
      handleApiError(res, error, MESSAGES.ERRORS.FETCH_PROFILE_FAILED);
    }
  }

  // Logout seguro: Expira e remove o Cookie HttpOnly do navegador
  async logout(req: Request, res: Response): Promise<void> {
    const isHttps = process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https';

    res.clearCookie('token', {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax'
    });
    res.json({ message: 'Sessão encerrada com sucesso.' });
  }

  // Garante que exista o usuário admin inicial cadastrado com senha criptografada em Bcrypt
  static async seedInitialUserIfNeeded() {
    try {
      const adminEmail = 'admin@adorehapp.com';
      const defaultPassword = '123456';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      const existingAdmin = await prisma.user.findUnique({
        where: { email: adminEmail }
      });

      if (!existingAdmin) {
        console.log('🌱 Criando usuário administrador inicial com senha criptografada (admin@adorehapp.com)...');
        await prisma.user.create({
          data: {
            fullName: 'Pr. Admin Presidente',
            email: adminEmail,
            password: hashedPassword,
            roles: ['SUPER_ADMIN'],
            isActive: true
          }
        });
        console.log('✅ Usuário administrador criado com sucesso no banco (Senha salva criptografada via Bcrypt).');
      } else if (!existingAdmin.password.startsWith('$2a$') && !existingAdmin.password.startsWith('$2b$')) {
        console.log('🔒 Criptografando credencial do usuário admin no banco de dados...');
        await prisma.user.update({
          where: { id: existingAdmin.id },
          data: { password: hashedPassword }
        });
        console.log('✅ Senha do administrador atualizada para Hash Bcrypt!');
      }
    } catch (err) {
      console.error('Erro ao verificar/criar usuário inicial:', err);
    }
  }
}
