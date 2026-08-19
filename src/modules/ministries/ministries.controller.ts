import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { MESSAGES } from '../../constants/messages';
import { handleApiError } from '../../utils/errorHandler';

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
      handleApiError(res, error, MESSAGES.ERRORS.MINISTRY_FETCH_FAILED);
    }
  }

  // Cria um novo cargo/ministério
  async createMinistry(req: Request, res: Response): Promise<void> {
    try {
      const { name, description } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({ error: MESSAGES.ERRORS.MINISTRY_NAME_REQUIRED });
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
        res.status(400).json({ error: MESSAGES.ERRORS.MINISTRY_ALREADY_EXISTS });
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
      handleApiError(res, error, MESSAGES.ERRORS.MINISTRY_CREATE_FAILED);
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
        res.status(404).json({ error: MESSAGES.ERRORS.MINISTRY_NOT_FOUND });
        return;
      }

      await prisma.ministry.delete({
        where: { id: id as string },
      });

      res.json({ message: MESSAGES.SUCCESS.MINISTRY_DELETED });
    } catch (error) {
      handleApiError(res, error, MESSAGES.ERRORS.MINISTRY_DELETE_FAILED);
    }
  }
}
