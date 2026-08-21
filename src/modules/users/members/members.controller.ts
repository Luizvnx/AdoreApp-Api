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
    const { fullName, password, phone, address, zipCode, neighborhood, birthDate, joinDate, baptismDate, ministries, maritalStatus, gender, connectionGroupId, roles, congregationId } = req.body;

    const isSuperAdmin = loggedUser?.roles?.includes('SUPER_ADMIN') || loggedUser?.role === 'SUPER_ADMIN';
    const isPastor = loggedUser?.roles?.includes('PASTOR') || loggedUser?.role === 'PASTOR';
    const isDirector = loggedUser?.roles?.includes('DIRECTOR') || loggedUser?.role === 'DIRECTOR';
    
    // As demais categorias, exceto membros e lideres de louvor e de GC podem editar os membros
    const cannotEditOthers = loggedUser?.roles?.some(r => ['MEMBER', 'WORSHIP_LEADER', 'GC_LEADER'].includes(r));
    const canEditOthers = isSuperAdmin || (!cannotEditOthers);

    try {
      const targetUser = await prisma.user.findUnique({ where: { id } });
      if (!targetUser) {
        res.status(404).json({ error: MESSAGES.ERRORS.MEMBER_NOT_FOUND });
        return;
      }

      // Trava de Segurança: Isolamento de Filial e Permissão de Edição
      if (!isSuperAdmin) {
        if (canEditOthers) {
          if (targetUser.congregationId !== loggedUser?.congregationId) {
            res.status(403).json({ error: "Acesso negado: Você só pode editar membros da sua própria filial." });
            return;
          }
        } else if (loggedUser?.id !== id) {
          res.status(403).json({ error: MESSAGES.ERRORS.MEMBER_SELF_EDIT_ONLY });
          return;
        }
      }

      // Apenas SUPER_ADMIN pode mudar a congregação (transferência de filial)
      let finalCongregationId = targetUser.congregationId;
      if (isSuperAdmin && congregationId !== undefined) {
        finalCongregationId = congregationId || null;
      }

      // Apenas administradores podem mudar roles
      let finalRoles = targetUser.roles;
      if ((isSuperAdmin || isPastor) && roles && Array.isArray(roles) && roles.length > 0) {
        finalRoles = roles;
      }

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
          roles: finalRoles,
          congregationId: finalCongregationId,
          ...(hashedPassword ? { password: hashedPassword } : {}),
          ...((isSuperAdmin || isPastor || isDirector) && connectionGroupId !== undefined ? { connectionGroupId: connectionGroupId || null } : {}),
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

  // Cadastrar Novo Membro
  async createMember(req: Request, res: Response): Promise<void> {
    const loggedUser = req.user;
    const {
      fullName,
      email,
      password,
      phone,
      address,
      zipCode,
      neighborhood,
      birthDate,
      joinDate,
      baptismDate,
      ministries,
      maritalStatus,
      gender,
      connectionGroupId,
      roles,
      congregationId
    } = req.body;

    const isSuperAdmin = loggedUser?.roles?.includes('SUPER_ADMIN') || loggedUser?.role === 'SUPER_ADMIN';
    const isPastor = loggedUser?.roles?.includes('PASTOR') || loggedUser?.role === 'PASTOR';

    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      res.status(400).json({ error: 'O nome completo é obrigatório.' });
      return;
    }

    try {
      // Definir congregação
      let finalCongregationId = loggedUser?.congregationId || null;
      if (isSuperAdmin && congregationId) {
        finalCongregationId = congregationId;
      }

      // Definir Email
      let targetEmail: string;
      const requestedEmail = email && typeof email === 'string' && email.trim();

      if (requestedEmail) {
        targetEmail = requestedEmail.toLowerCase();
        
        // Verificar se e-mail já existe no User
        const existingUser = await prisma.user.findUnique({ where: { email: targetEmail } });
        const existingVisitor = await prisma.visitor.findFirst({ where: { email: targetEmail } });

        // Se existir um visitante órfão (status MEMBRO sem user), desvincula o e-mail para preservar a ficha histórica para gráficos
        if (existingVisitor && existingVisitor.status === 'MEMBRO' && !existingUser) {
          await prisma.visitor.update({
            where: { id: existingVisitor.id },
            data: { email: null, userId: null }
          });
        } else if (existingUser || existingVisitor) {
          res.status(400).json({ error: MESSAGES.ERRORS.EMAIL_ALREADY_EXISTS });
          return;
        }
      } else {
        // Se e-mail não for informado, gerar um e-mail legível
        const firstName = fullName
          .trim()
          .split(' ')[0]
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '') || 'membro';

        const phoneDigits = phone ? phone.replace(/\D/g, '') : '';
        const baseIdentifier = phoneDigits || Math.floor(1000 + Math.random() * 9000).toString();

        targetEmail = `${firstName}.${baseIdentifier}@aviva.com`;
        let counter = 2;
        while (await prisma.user.findUnique({ where: { email: targetEmail } })) {
          targetEmail = `${firstName}.${baseIdentifier}.${counter}@aviva.com`;
          counter++;
        }
      }

      // Definir Senha
      const rawPassword = (password && typeof password === 'string' && password.trim().length > 0)
        ? password.trim()
        : crypto.randomBytes(4).toString('hex');
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      // Definir Roles
      let finalRoles = ['MEMBER'];
      if ((isSuperAdmin || isPastor) && roles && Array.isArray(roles) && roles.length > 0) {
        finalRoles = roles;
      }

      // Criar o Usuário + MemberProfile
      const newMember = await prisma.user.create({
        data: {
          fullName: fullName.trim(),
          email: targetEmail,
          password: hashedPassword,
          roles: finalRoles as any,
          congregationId: finalCongregationId,
          connectionGroupId: connectionGroupId || null,
          memberProfile: {
            create: {
              phone: phone || null,
              address: address || null,
              zipCode: zipCode || null,
              neighborhood: neighborhood || null,
              maritalStatus: maritalStatus || null,
              gender: gender || null,
              birthDate: birthDate ? new Date(birthDate) : null,
              joinDate: joinDate ? new Date(joinDate) : new Date(),
              baptismDate: baptismDate ? new Date(baptismDate) : null,
              ministries: ministries || []
            }
          }
        },
        include: {
          memberProfile: true,
          congregation: { select: { id: true, name: true } },
          connectionGroup: { select: { id: true, name: true } }
        }
      });

      res.status(201).json({
        message: 'Membro cadastrado com sucesso!',
        member: newMember,
        credentials: {
          email: targetEmail,
          password: rawPassword
        }
      });
    } catch (error) {
      handleApiError(res, error, 'Erro ao cadastrar novo membro.');
    }
  }

  // Excluir membro (Remoção total e definitiva do Banco de Dados)
  async deleteMember(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const loggedUser = req.user;
      
      const isSuperAdmin = loggedUser?.roles?.includes('SUPER_ADMIN');
      const isPastor = loggedUser?.roles?.includes('PASTOR');
      const isDirector = loggedUser?.roles?.includes('DIRECTOR');

      if (!isSuperAdmin && !isPastor && !isDirector) {
        res.status(403).json({ error: 'Acesso negado: Apenas administradores, pastores e diretoria podem excluir membros.' });
        return;
      }

      const targetUser = await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, congregationId: true }
      });
      
      if (!targetUser) {
        res.status(404).json({ error: MESSAGES.ERRORS.MEMBER_NOT_FOUND });
        return;
      }

      if (!isSuperAdmin) {
        if (targetUser.congregationId !== loggedUser?.congregationId) {
          res.status(403).json({ error: 'Acesso negado: Você só pode excluir membros da sua própria filial.' });
          return;
        }
      }

      // Prevenir exclusão de si mesmo
      if (targetUser.id === loggedUser?.id) {
         res.status(400).json({ error: 'Você não pode excluir sua própria conta.' });
         return;
      }

      const emailToClean = targetUser.email ? targetUser.email.trim().toLowerCase() : null;

      // 1. Preservar as fichas históricas de visitantes no banco (para manter os gráficos e relatórios consolidados),
      // apenas desvinculando o userId e limpando o e-mail para permitir o recadastro.
      await prisma.visitor.updateMany({
        where: {
          OR: [
            { userId: targetUser.id },
            ...(emailToClean ? [{ email: emailToClean }] : [])
          ]
        },
        data: {
          userId: null,
          email: null
        }
      });

      // 2. Desvincular de cadastros onde este usuário figurava como o cadastrador
      await prisma.visitor.updateMany({
        where: { registeredById: targetUser.id },
        data: { registeredById: null }
      });

      // 3. Desvincular de GCs liderados por ele
      await prisma.connectionGroup.updateMany({
        where: { leaderId: targetUser.id },
        data: { leaderId: null }
      });

      // 4. Desvincular relatórios de cultos e transações financeiras
      await prisma.serviceAttendance.updateMany({
        where: { createdById: targetUser.id },
        data: { createdById: null }
      });
      await prisma.financialTransaction.updateMany({
        where: { createdById: targetUser.id },
        data: { createdById: null }
      });
      await prisma.financialTransaction.updateMany({
        where: { editedById: targetUser.id },
        data: { editedById: null }
      });
      await prisma.fixedExpense.updateMany({
        where: { createdById: targetUser.id },
        data: { createdById: null }
      });

      // 5. Apagar o perfil detalhado (MemberProfile)
      await prisma.memberProfile.deleteMany({
        where: { userId: targetUser.id }
      });

      // 6. Apagar o registro User definitivamente do Banco de Dados
      await prisma.user.delete({
        where: { id: targetUser.id }
      });

      res.json({ message: 'Membro e todas as suas fichas associadas foram excluídos permanentemente do banco de dados.' });
    } catch (error) {
      handleApiError(res, error, 'Erro ao excluir membro do banco de dados.');
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
          congregationId: visitor.congregationId || null,
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
