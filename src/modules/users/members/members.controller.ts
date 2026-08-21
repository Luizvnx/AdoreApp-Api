import { Request, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sendTemporaryPasswordEmail } from '../../../services/email.service';
import { MESSAGES } from '../../../constants/messages';
import { handleApiError } from '../../../utils/errorHandler';

export class MembersController {
  // Lista todos os membros com seus perfis e relacionamentos
  async listMembers(req: Request, res: Response) {
    try {
      const user = req.user;
      const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN');
      const paramCongregationId = req.query.congregationId as string;

      let where: any = { isActive: true };
      if (isSuperAdmin) {
        if (paramCongregationId && paramCongregationId !== 'ALL') {
          where.congregationId = paramCongregationId;
        }
      } else {
        if (user?.congregationId) {
          where.congregationId = user.congregationId;
        }
      }

      const members = await prisma.user.findMany({
        where,
        include: {
          memberProfile: true,
          congregation: {
            select: { id: true, name: true }
          },
          connectionGroup: {
            select: { id: true, name: true }
          }
        },
        orderBy: {
          fullName: 'asc'
        }
      });
      res.json(members);
    } catch (error) {
      handleApiError(res, error, MESSAGES.ERRORS.MEMBER_FETCH_FAILED);
    }
  }

  // Atualiza as informações do membro
  async updateMember(req: Request, res: Response) {
    const id = req.params.id as string;
    const loggedUser = req.user;
    const { fullName, password, phone, address, zipCode, neighborhood, birthDate, joinDate, baptismDate, ministries, maritalStatus, gender, connectionGroupId, roles } = req.body;

    const isSuperAdmin = loggedUser?.roles?.includes('SUPER_ADMIN') || loggedUser?.role === 'SUPER_ADMIN';

    // Trava de Segurança: Se não for SUPER_ADMIN, o usuário SÓ PODE alterar o seu PRÓPRIO perfil
    if (!isSuperAdmin && loggedUser?.id !== id) {
      res.status(403).json({ error: MESSAGES.ERRORS.MEMBER_SELF_EDIT_ONLY });
      return;
    }

    try {
      // Criptografa a nova senha se fornecida
      let hashedPassword: string | undefined = undefined;
      if (password && typeof password === 'string' && password.trim().length > 0) {
        hashedPassword = await bcrypt.hash(password.trim(), 10);
      }

      // 1. Atualizar o User
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          fullName,
          ...(isSuperAdmin && roles && Array.isArray(roles) && roles.length > 0 ? { roles } : {}),
          ...(hashedPassword ? { password: hashedPassword } : {}),
          ...(isSuperAdmin && connectionGroupId !== undefined ? { connectionGroupId: connectionGroupId || null } : {}),
          memberProfile: {
            upsert: {
              create: {
                phone,
                address,
                zipCode,
                neighborhood,
                maritalStatus: maritalStatus || null,
                gender: gender || null,
                birthDate: birthDate ? new Date(birthDate) : null,
                joinDate: joinDate ? new Date(joinDate) : null,
                baptismDate: baptismDate ? new Date(baptismDate) : null,
                ministries: ministries || []
              },
              update: {
                phone,
                address,
                zipCode,
                neighborhood,
                maritalStatus: maritalStatus || null,
                gender: gender || null,
                birthDate: birthDate ? new Date(birthDate) : null,
                joinDate: joinDate ? new Date(joinDate) : null,
                baptismDate: baptismDate ? new Date(baptismDate) : null,
                ministries: ministries || []
              }
            }
          }
        },
        include: {
          memberProfile: true,
          connectionGroup: {
            select: { id: true, name: true }
          }
        }
      });

      res.json(updatedUser);
    } catch (error) {
      handleApiError(res, error, MESSAGES.ERRORS.MEMBER_UPDATE_FAILED);
    }
  }

  // Converte um Visitante em Membro
  async convertVisitorToMember(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;

    try {
      // 1. Buscar o visitante
      const visitor = await prisma.visitor.findUnique({
        where: { id }
      });

      if (!visitor) {
        res.status(404).json({ error: MESSAGES.ERRORS.VISITOR_NOT_FOUND });
        return;
      }

      if (visitor.status === 'MEMBRO') {
        res.status(400).json({ error: MESSAGES.ERRORS.VISITOR_ALREADY_MEMBER });
        return;
      }

      // 2. Definir e-mail e senha temporária
      const requestedEmail = req.body?.email && typeof req.body.email === 'string' && req.body.email.trim();
      const visitorEmail = visitor.email && visitor.email.trim();

      let targetEmail: string;

      if (requestedEmail) {
        targetEmail = requestedEmail.toLowerCase();
      } else if (visitorEmail) {
        targetEmail = visitorEmail.toLowerCase();
      } else {
        // Se o visitante não possuía e-mail, gera um e-mail legível com o Primeiro Nome + Telefone (ex: joao.79988562587@aviva.com)
        const firstName = visitor.fullName
          .trim()
          .split(' ')[0]
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '') || 'membro';

        const phoneDigits = visitor.phone ? visitor.phone.replace(/\D/g, '') : '';
        const baseIdentifier = phoneDigits || visitor.id.slice(0, 4);

        targetEmail = `${firstName}.${baseIdentifier}@aviva.com`;

        // Se por acaso este e-mail amigável já existir no banco, acrescenta um contador numérico legível (ex: joao.79988562587.2@aviva.com)
        let counter = 2;
        let candidateEmail = targetEmail;

        while (await prisma.user.findUnique({ where: { email: candidateEmail } })) {
          candidateEmail = `${firstName}.${baseIdentifier}.${counter}@aviva.com`;
          counter++;
        }

        targetEmail = candidateEmail;
      }

      // Se o e-mail (real ou fornecido no body) já pertencer a outro usuário
      const existingUser = await prisma.user.findUnique({
        where: { email: targetEmail }
      });

      if (existingUser && (requestedEmail || visitorEmail)) {
        res.status(400).json({ error: MESSAGES.ERRORS.EMAIL_ALREADY_EXISTS });
        return;
      }

      const tempPassword = crypto.randomBytes(4).toString('hex'); // 8 chars (em texto puro para envio ao visitante)
      const hashedPassword = await bcrypt.hash(tempPassword, 10); // Criptografia Bcrypt para o banco de dados

      // 3. Criar o User (Membro) com a senha criptografada e herdar informações do Visitante no Perfil
      const newMember = await prisma.user.create({
        data: {
          fullName: visitor.fullName,
          email: targetEmail,
          password: hashedPassword,
          roles: ['MEMBER'],
          connectionGroupId: visitor.connectionGroupId || null,
          memberProfile: {
            create: {
              phone: visitor.phone,
              address: visitor.fullAddress,
              neighborhood: visitor.neighborhood,
              maritalStatus: visitor.maritalStatus || null,
              birthDate: visitor.birthDate,
              joinDate: new Date(),
              baptismDate: visitor.isBaptized ? visitor.visitDate : null,
            }
          }
        }
      });

      // 4. Atualizar o Visitante
      await prisma.visitor.update({
        where: { id },
        data: {
          status: 'MEMBRO',
          userId: newMember.id
        }
      });

      // 5. Enviar e-mail com a senha temporária usando Nodemailer
      let emailSent = false;
      try {
        emailSent = await sendTemporaryPasswordEmail(targetEmail, newMember.fullName, tempPassword);
      } catch (mailErr) {
        console.error('Falha ao disparar e-mail de boas-vindas:', mailErr);
      }

      // 6. Retornar os dados gerados ao cliente
      res.json({
        message: emailSent
          ? 'Visitante convertido em Membro com sucesso. Um e-mail com a senha temporária foi enviado.'
          : 'Visitante convertido em Membro com sucesso.',
        emailSent,
        member: newMember,
        credentials: {
          email: targetEmail,
          password: tempPassword
        }
      });
    } catch (error) {
      handleApiError(res, error, MESSAGES.ERRORS.MEMBER_CONVERSION_FAILED);
    }
  }
}
