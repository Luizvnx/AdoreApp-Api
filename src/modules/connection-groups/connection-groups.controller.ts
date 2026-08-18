import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

const DEFAULT_GCS = ['IDE', 'Reobote', 'Chosen', 'Rebecas'];

export class ConnectionGroupController {
  // Lista todos os Grupos de Conexão (GCs). Carrega os GCs padrão (IDE, Reobote, Chosen, Rebecas) se a tabela estiver vazia.
  async listGroups(_req: Request, res: Response): Promise<void> {
    try {
      let count = await prisma.connectionGroup.count();

      if (count === 0) {
        await prisma.connectionGroup.createMany({
          data: DEFAULT_GCS.map((name) => ({ name })),
          skipDuplicates: true,
        });
      }

      const groups = await prisma.connectionGroup.findMany({
        orderBy: { name: 'asc' },
        include: {
          leader: {
            select: { id: true, fullName: true, email: true }
          },
          _count: {
            select: { members: true, visitors: true }
          }
        }
      });

      res.json(groups);
    } catch (error) {
      console.error('Erro ao listar Grupos de Conexão:', error);
      res.status(500).json({ error: 'Erro ao listar Grupos de Conexão.' });
    }
  }

  // Cria um novo Grupo de Conexão (GC)
  async createGroup(req: Request, res: Response): Promise<void> {
    try {
      const { name, neighborhood, meetingDay, meetingTime, leaderId } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({ error: 'O nome do Grupo de Conexão (GC) é obrigatório.' });
        return;
      }

      const trimmedName = name.trim();

      const existing = await prisma.connectionGroup.findFirst({
        where: {
          name: {
            equals: trimmedName,
            mode: 'insensitive',
          },
        },
      });

      if (existing) {
        res.status(400).json({ error: `O GC "${trimmedName}" já está cadastrado.` });
        return;
      }

      const group = await prisma.connectionGroup.create({
        data: {
          name: trimmedName,
          neighborhood: neighborhood?.trim() || null,
          meetingDay: meetingDay?.trim() || null,
          meetingTime: meetingTime?.trim() || null,
          leaderId: leaderId || null,
        },
        include: {
          leader: { select: { id: true, fullName: true } },
          _count: { select: { members: true, visitors: true } }
        }
      });

      res.status(201).json(group);
    } catch (error) {
      console.error('Erro ao criar Grupo de Conexão:', error);
      res.status(500).json({ error: 'Erro ao criar Grupo de Conexão.' });
    }
  }

  // Atualiza um Grupo de Conexão (GC)
  async updateGroup(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, neighborhood, meetingDay, meetingTime, leaderId } = req.body;

      const existing = await prisma.connectionGroup.findUnique({
        where: { id: id as string },
      });

      if (!existing) {
        res.status(404).json({ error: 'Grupo de Conexão (GC) não encontrado.' });
        return;
      }

      const updated = await prisma.connectionGroup.update({
        where: { id: id as string },
        data: {
          ...(name ? { name: name.trim() } : {}),
          ...(neighborhood !== undefined ? { neighborhood: neighborhood?.trim() || null } : {}),
          ...(meetingDay !== undefined ? { meetingDay: meetingDay?.trim() || null } : {}),
          ...(meetingTime !== undefined ? { meetingTime: meetingTime?.trim() || null } : {}),
          ...(leaderId !== undefined ? { leaderId: leaderId || null } : {}),
        },
        include: {
          leader: { select: { id: true, fullName: true } },
          _count: { select: { members: true, visitors: true } }
        }
      });

      res.json(updated);
    } catch (error) {
      console.error('Erro ao atualizar Grupo de Conexão:', error);
      res.status(500).json({ error: 'Erro ao atualizar Grupo de Conexão.' });
    }
  }

  // Exclui um Grupo de Conexão (GC) pelo ID
  async deleteGroup(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const existing = await prisma.connectionGroup.findUnique({
        where: { id: id as string },
      });

      if (!existing) {
        res.status(404).json({ error: 'Grupo de Conexão (GC) não encontrado.' });
        return;
      }

      // Desvincular membros e visitantes antes de excluir o GC
      await prisma.user.updateMany({
        where: { connectionGroupId: id as string },
        data: { connectionGroupId: null },
      });

      await prisma.visitor.updateMany({
        where: { connectionGroupId: id as string },
        data: { connectionGroupId: null },
      });

      await prisma.connectionGroup.delete({
        where: { id: id as string },
      });

      res.json({ message: 'Grupo de Conexão (GC) excluído com sucesso.' });
    } catch (error) {
      console.error('Erro ao excluir Grupo de Conexão:', error);
      res.status(500).json({ error: 'Erro ao excluir Grupo de Conexão.' });
    }
  }
}
