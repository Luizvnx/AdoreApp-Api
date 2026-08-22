import { prisma } from '../../lib/prisma';
import { MaritalStatus, Prisma } from '@prisma/client';
import { whatsAppService } from '../whatsapp/whatsapp.service';

export interface CreateVisitorDTO {
  fullName: string;
  email?: string;
  phone?: string;
  maritalStatus?: MaritalStatus;
  birthDate?: string | Date;
  isBaptized?: boolean;
  neighborhood?: string;
  fullAddress?: string;
  wantsToJoinGC?: boolean;
  howDidYouArrive?: string;
  visitDate?: string | Date;
  registeredById?: string;
  connectionGroupId?: string;
  congregationId?: string;
}

export interface UpdateVisitorDTO extends Partial<CreateVisitorDTO> {}

export class VisitorService {
  private async checkEmailAvailability(email?: string | null, currentVisitorId?: string) {
    if (!email || typeof email !== 'string' || !email.trim()) return;
    const cleanEmail = email.trim().toLowerCase();

    // 1. Verificar se já existe um Usuário/Membro com este e-mail
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existingUser) {
      throw new Error('Este e-mail já pertence a um Membro/Usuário cadastrado no sistema.');
    }

    // 2. Verificar se já existe outro Visitante com este e-mail
    const existingVisitor = await prisma.visitor.findFirst({
      where: {
        email: cleanEmail,
        ...(currentVisitorId ? { id: { not: currentVisitorId } } : {}),
      },
    });
    if (existingVisitor) {
      if (existingVisitor.status === 'MEMBRO' && !existingUser) {
        // Visitante órfão resultante de exclusão de membro anterior - desvincula e-mail mantendo a ficha para os gráficos
        await prisma.visitor.update({
          where: { id: existingVisitor.id },
          data: { email: null, userId: null }
        });
      } else {
        throw new Error('Este e-mail já está cadastrado para outro visitante.');
      }
    }
  }

  async create(data: CreateVisitorDTO) {
    const { birthDate, visitDate, email, connectionGroupId, congregationId, ...rest } = data;
    const cleanEmail = email && typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;

    if (cleanEmail) {
      await this.checkEmailAvailability(cleanEmail);
    }

    const visitor = await prisma.visitor.create({
      data: {
        ...rest,
        email: cleanEmail,
        connectionGroupId: connectionGroupId || null,
        congregationId: congregationId || null,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        visitDate: visitDate ? new Date(visitDate) : undefined,
      },
      include: {
        registeredBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            memberProfile: {
              select: { phone: true }
            }
          },
        },
        connectionGroup: {
          select: { id: true, name: true },
        },
        congregation: {
          select: { id: true, name: true }
        }
      },
    });

    // Dispara a mensagem de boas-vindas do WhatsApp em segundo plano via Evolution API (se o visitante tiver telefone)
    if (visitor.phone) {
      whatsAppService.sendWelcomeMessageToVisitor(visitor).catch((err) => {
        console.warn('[WhatsApp Automático] Não foi possível enviar a mensagem de boas-vindas:', err);
      });
    }

    return visitor;
  }

  async findAll(params?: { search?: string; neighborhood?: string; wantsToJoinGC?: boolean; connectionGroupId?: string; congregationId?: string }) {
    // Não listar visitantes que já foram convertidos em Membros
    const where: Prisma.VisitorWhereInput = {
      status: { not: 'MEMBRO' },
    };

    if (params?.congregationId) {
      where.congregationId = params.congregationId;
    }

    if (params?.search) {
      where.OR = [
        { fullName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
        { neighborhood: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params?.neighborhood) {
      where.neighborhood = { contains: params.neighborhood, mode: 'insensitive' };
    }

    if (typeof params?.wantsToJoinGC === 'boolean') {
      where.wantsToJoinGC = params.wantsToJoinGC;
    }

    if (params?.connectionGroupId) {
      where.connectionGroupId = params.connectionGroupId;
    }

    return prisma.visitor.findMany({
      where,
      orderBy: { visitDate: 'desc' },
      include: {
        registeredBy: {
          select: { id: true, fullName: true, email: true },
        },
        connectionGroup: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async findById(id: string) {
    return prisma.visitor.findUnique({
      where: { id },
      include: {
        registeredBy: {
          select: { id: true, fullName: true, email: true },
        },
        connectionGroup: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async update(id: string, data: UpdateVisitorDTO) {
    const { birthDate, visitDate, email, connectionGroupId, ...rest } = data;
    const cleanEmail = email && typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : (email === '' ? null : undefined);

    if (cleanEmail) {
      await this.checkEmailAvailability(cleanEmail, id);
    }

    return prisma.visitor.update({
      where: { id },
      data: {
        ...rest,
        ...(cleanEmail !== undefined ? { email: cleanEmail } : {}),
        ...(connectionGroupId !== undefined ? { connectionGroupId: connectionGroupId || null } : {}),
        birthDate: birthDate ? new Date(birthDate) : undefined,
        visitDate: visitDate ? new Date(visitDate) : undefined,
      },
      include: {
        registeredBy: {
          select: { id: true, fullName: true, email: true },
        },
        connectionGroup: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async delete(id: string) {
    return prisma.visitor.delete({
      where: { id },
    });
  }
}

export const visitorService = new VisitorService();
