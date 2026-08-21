import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { handleApiError } from '../../utils/errorHandler';

export class CongregationController {
  // Listar todas as congregações (SUPER_ADMIN vê todas; outros veem apenas a sua própria)
  async list(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const isSuperAdmin = user.roles.includes('SUPER_ADMIN');

      let where: any = {};
      if (!isSuperAdmin) {
        if (!user.congregationId) {
          // Se o usuário não tiver congregationId, busca a Sede
          const hq = await prisma.congregation.findFirst({ where: { isHeadquarter: true } });
          where.id = hq?.id || 'none';
        } else {
          where.id = user.congregationId;
        }
      }

      const congregations = await prisma.congregation.findMany({
        where,
        orderBy: [{ isHeadquarter: 'desc' }, { name: 'asc' }],
        include: {
          _count: {
            select: {
              users: true,
              visitors: true,
              connectionGroups: true,
              financialTransactions: true,
            }
          }
        }
      });

      res.json(congregations);
    } catch (error) {
      handleApiError(res, error, 'Erro ao listar congregações.');
    }
  }

  // Obter detalhes de uma congregação por ID
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user;

      if (!user) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const isSuperAdmin = user.roles.includes('SUPER_ADMIN');
      if (!isSuperAdmin && user.congregationId !== id) {
        res.status(403).json({ error: 'Acesso negado. Você só pode visualizar os dados da sua própria congregação.' });
        return;
      }

      const congregation = await prisma.congregation.findUnique({
        where: { id: id as string },
        include: {
          _count: {
            select: {
              users: true,
              visitors: true,
              connectionGroups: true,
              financialTransactions: true
            }
          }
        }
      });

      if (!congregation) {
        res.status(404).json({ error: 'Congregação não encontrada.' });
        return;
      }

      res.json(congregation);
    } catch (error) {
      handleApiError(res, error, 'Erro ao buscar dados da congregação.');
    }
  }

  // Criar nova congregação (Apenas SUPER_ADMIN)
  async create(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user || !user.roles.includes('SUPER_ADMIN')) {
        res.status(403).json({ error: 'Apenas o Pastor Presidente / SUPER_ADMIN pode cadastrar novas filiais.' });
        return;
      }

      const { name, address, phone, foundedAt, isHeadquarter } = req.body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'O nome da congregação é obrigatório.' });
        return;
      }

      // Se for marcada como Sede, desmarca as outras Sedes
      if (isHeadquarter === true) {
        await prisma.congregation.updateMany({
          where: { isHeadquarter: true },
          data: { isHeadquarter: false }
        });
      }

      const congregation = await prisma.congregation.create({
        data: {
          name: name.trim(),
          address: address ? address.trim() : null,
          phone: phone ? phone.trim() : null,
          foundedAt: foundedAt ? new Date(foundedAt) : null,
          isHeadquarter: !!isHeadquarter
        }
      });

      res.status(201).json(congregation);
    } catch (error) {
      handleApiError(res, error, 'Erro ao cadastrar congregação.');
    }
  }

  // Atualizar congregação existente (Apenas SUPER_ADMIN)
  async update(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user || !user.roles.includes('SUPER_ADMIN')) {
        res.status(403).json({ error: 'Apenas o Pastor Presidente / SUPER_ADMIN pode alterar dados de congregações.' });
        return;
      }

      const { id } = req.params;
      const { name, address, phone, foundedAt, isHeadquarter } = req.body;

      const existing = await prisma.congregation.findUnique({ where: { id: id as string } });
      if (!existing) {
        res.status(404).json({ error: 'Congregação não encontrada.' });
        return;
      }

      if (isHeadquarter === true && !existing.isHeadquarter) {
        await prisma.congregation.updateMany({
          where: { isHeadquarter: true },
          data: { isHeadquarter: false }
        });
      }

      const updated = await prisma.congregation.update({
        where: { id: id as string },
        data: {
          name: name !== undefined ? name.trim() : existing.name,
          address: address !== undefined ? (address ? address.trim() : null) : existing.address,
          phone: phone !== undefined ? (phone ? phone.trim() : null) : existing.phone,
          foundedAt: foundedAt !== undefined ? (foundedAt ? new Date(foundedAt) : null) : existing.foundedAt,
          isHeadquarter: isHeadquarter !== undefined ? !!isHeadquarter : existing.isHeadquarter
        }
      });

      res.json(updated);
    } catch (error) {
      handleApiError(res, error, 'Erro ao atualizar congregação.');
    }
  }

  // Excluir congregação (Apenas SUPER_ADMIN, se não for a Sede)
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user || !user.roles.includes('SUPER_ADMIN')) {
        res.status(403).json({ error: 'Apenas o Pastor Presidente / SUPER_ADMIN pode excluir filiais.' });
        return;
      }

      const { id } = req.params;

      const existing = await prisma.congregation.findUnique({ where: { id: id as string } });
      if (!existing) {
        res.status(404).json({ error: 'Congregação não encontrada.' });
        return;
      }

      if (existing.isHeadquarter) {
        res.status(400).json({ error: 'Não é possível excluir a congregação definida como Sede Principal.' });
        return;
      }

      await prisma.congregation.delete({ where: { id: id as string } });
      res.json({ message: 'Congregação removida com sucesso.' });
    } catch (error) {
      handleApiError(res, error, 'Erro ao excluir congregação.');
    }
  }

  // Relatório Dashboard Consolidado para SUPER_ADMIN (ou por filial específica)
  async getDashboardReport(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Não autorizado' });
        return;
      }

      const isSuperAdmin = user.roles.includes('SUPER_ADMIN');
      const requestedCongregationId = req.query.congregationId as string;

      let filterCongregationId: string | undefined = undefined;

      if (isSuperAdmin) {
        if (requestedCongregationId && requestedCongregationId !== 'ALL') {
          filterCongregationId = requestedCongregationId;
        }
      } else {
        filterCongregationId = user.congregationId || undefined;
      }

      const whereFilter = filterCongregationId ? { congregationId: filterCongregationId } : {};

      const [totalMembers, totalVisitors, totalGCs, congregationsCount, incomeAggregate, expenseAggregate] = await Promise.all([
        prisma.user.count({ where: whereFilter }),
        prisma.visitor.count({ where: whereFilter }),
        prisma.connectionGroup.count({ where: whereFilter }),
        prisma.congregation.count(),
        prisma.financialTransaction.aggregate({
          _sum: { amount: true },
          where: { ...whereFilter, type: 'INCOME' }
        }),
        prisma.financialTransaction.aggregate({
          _sum: { amount: true },
          where: { ...whereFilter, type: 'EXPENSE' }
        })
      ]);

      const totalIncome = incomeAggregate._sum.amount || 0;
      const totalExpense = expenseAggregate._sum.amount || 0;
      const netBalance = totalIncome - totalExpense;

      res.json({
        period: 'Visão Geral Multi-Congregações',
        congregationId: filterCongregationId || 'ALL',
        isGlobalView: !filterCongregationId,
        metrics: {
          congregationsCount,
          totalMembers,
          totalVisitors,
          totalGCs,
          totalIncome,
          totalExpense,
          netBalance
        }
      });
    } catch (error) {
      handleApiError(res, error, 'Erro ao gerar relatório de dashboard.');
    }
  }
}
