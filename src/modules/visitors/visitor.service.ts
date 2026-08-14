import { prisma } from '../../lib/prisma';
import { MaritalStatus, Prisma } from '@prisma/client';

export interface CreateVisitorDTO {
  fullName: string;
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
}

export interface UpdateVisitorDTO extends Partial<CreateVisitorDTO> {}

export class VisitorService {
  async create(data: CreateVisitorDTO) {
    const { birthDate, visitDate, ...rest } = data;

    return prisma.visitor.create({
      data: {
        ...rest,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        visitDate: visitDate ? new Date(visitDate) : undefined,
      },
      include: {
        registeredBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }

  async findAll(params?: { search?: string; neighborhood?: string; wantsToJoinGC?: boolean }) {
    const where: Prisma.VisitorWhereInput = {};

    if (params?.search) {
      where.OR = [
        { fullName: { contains: params.search, mode: 'insensitive' } },
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

    return prisma.visitor.findMany({
      where,
      orderBy: { visitDate: 'desc' },
      include: {
        registeredBy: {
          select: { id: true, fullName: true, email: true },
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
      },
    });
  }

  async update(id: string, data: UpdateVisitorDTO) {
    const { birthDate, visitDate, ...rest } = data;

    return prisma.visitor.update({
      where: { id },
      data: {
        ...rest,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        visitDate: visitDate ? new Date(visitDate) : undefined,
      },
      include: {
        registeredBy: {
          select: { id: true, fullName: true, email: true },
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
