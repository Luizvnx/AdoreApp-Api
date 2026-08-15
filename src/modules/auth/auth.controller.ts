import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
        return;
      }

      const cleanEmail = email.trim().toLowerCase();

      // 1. Buscar usuário cadastrado pelo e-mail
      const user = await prisma.user.findUnique({
        where: { email: cleanEmail },
        include: {
          memberProfile: true,
          connectionGroup: {
            select: { id: true, name: true }
          }
        }
      });

      // 2. Se o usuário não existir no banco
      if (!user) {
        res.status(401).json({ error: 'Email ou senha incorretos.' });
        return;
      }

      // 3. Verificar se o usuário está ativo
      if (!user.isActive) {
        res.status(401).json({ error: 'Esta conta de usuário foi desativada.' });
        return;
      }

      // 4. Verificar senha criptografada com bcrypt (com fallback de atualização transparente para senhas legadas)
      let isPasswordValid = false;

      if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
        // Comparação segura de Hash Bcrypt
        isPasswordValid = await bcrypt.compare(password, user.password);
      } else {
        // Se a senha estiver salva em texto puro no banco (legado de testes), compara e atualiza para Hash Bcrypt
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
        res.status(401).json({ error: 'Senha incorreta.' });
        return;
      }

      // 5. Gerar token JWT sintético e seguro
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.fullName,
        role: user.roles[0] || 'MEMBER',
        roles: user.roles,
        exp: Math.floor(Date.now() / 1000) + (86400 * 7) // 7 dias
      }));
      const signature = crypto.createHmac('sha256', 'adorehAppSecretKeyKey2026').update(`${header}.${payload}`).digest('hex');
      const token = `${header}.${payload}.${signature}`;

      // 6. Retornar dados do usuário autenticado
      res.json({
        message: 'Login realizado com sucesso.',
        token,
        user: {
          id: user.id,
          name: user.fullName,
          email: user.email,
          role: user.roles[0] || 'MEMBER',
          roles: user.roles,
          connectionGroupId: user.connectionGroupId
        }
      });
    } catch (error) {
      console.error('Erro na autenticação:', error);
      res.status(500).json({ error: 'Erro interno ao realizar autenticação.' });
    }
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
        // Se o admin já existir mas estiver com senha em texto puro, atualiza para Hash Bcrypt
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
