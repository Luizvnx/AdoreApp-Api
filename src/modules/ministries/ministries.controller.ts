import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

const DEFAULT_MINISTRIES = [
  'Louvor',
  'Tesouraria',
  'Membro',
  'Líder de GC',
  'Diácono',
  'Cerimonial',
  'Infantil',
  'Acolhimento',
  'Intercessão',
  'Mídia',
];

export class MinistryController {
  // Lista todos os cargos/ministérios. Se a tabela estiver vazia, carrega os cargos padrão automaticamente.
  async listMinistries(_req: Request, res: Response): Promise<void> {
    try {
      let count = await prisma.ministry.count();

      if (count === 0) {
        // Seed inicial dos cargos sugeridos
        await prisma.ministry.createMany({
          data: DEFAULT_MINISTRIES.map((name) => ({ name })),
          skipDuplicates: true,
        });
      }

      const ministries = await prisma.ministry.findMany({
        orderBy: { name: 'asc' },
      });

      res.json(ministries);
    } catch (error) {
      console.error('Erro ao listar cargos/ministérios:', error);
      res.status(500).json({ error: 'Erro ao listar cargos e ministérios.' });
    }
  }

  // Cria um novo cargo/ministério
  async createMinistry(req: Request, res: Response): Promise<void> {
    try {
      const { name, description } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({ error: 'O nome do cargo/ministério é obrigatório.' });
        return;
      }

      const trimmedName = name.trim();

      const existing = await prisma.ministry.findFirst({
        where: {
          name: {
            equals: trimmedName,
            mode: 'insensitive',
          },
        },
      });

      if (existing) {
        res.status(400).json({ error: `O cargo "${trimmedName}" já está cadastrado.` });
        return;
      }

      const ministry = await prisma.ministry.create({
        data: {
          name: trimmedName,
          description: description?.trim() || null,
        },
      });

      res.status(201).json(ministry);
    } catch (error) {
      console.error('Erro ao criar cargo/ministério:', error);
      res.status(500).json({ error: 'Erro ao criar cargo ou ministério.' });
    }
  }

  // Exclui um cargo/ministério pelo ID
  async deleteMinistry(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const existing = await prisma.ministry.findUnique({
        where: { id: id as string },
      });

      if (!existing) {
        res.status(404).json({ error: 'Cargo/ministério não encontrado.' });
        return;
      }

      await prisma.ministry.delete({
        where: { id: id as string },
      });

      res.json({ message: 'Cargo/ministério excluído com sucesso.' });
    } catch (error) {
      console.error('Erro ao excluir cargo/ministério:', error);
      res.status(500).json({ error: 'Erro ao excluir cargo ou ministério.' });
    }
  }
}
