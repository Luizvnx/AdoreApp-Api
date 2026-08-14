import { Request, Response } from 'express';
import { visitorService } from './visitor.service';

export class VisitorController {
  private getIdParam(id: string | string[] | undefined): string | null {
    if (!id) return null;
    if (Array.isArray(id)) return id[0] || null;
    return typeof id === 'string' ? id : null;
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { fullName } = req.body;
      if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
        res.status(400).json({ error: 'O nome completo (fullName) é obrigatório.' });
        return;
      }

      const visitor = await visitorService.create(req.body);
      res.status(201).json(visitor);
    } catch (error: any) {
      console.error('[VisitorController.create] Error:', error);
      res.status(400).json({ error: error.message || 'Falha ao cadastrar visitante.' });
    }
  }

  async findAll(req: Request, res: Response): Promise<void> {
    try {
      const { search, neighborhood, wantsToJoinGC } = req.query;

      const visitors = await visitorService.findAll({
        search: typeof search === 'string' ? search : undefined,
        neighborhood: typeof neighborhood === 'string' ? neighborhood : undefined,
        wantsToJoinGC: wantsToJoinGC === 'true' ? true : wantsToJoinGC === 'false' ? false : undefined,
      });

      res.status(200).json(visitors);
    } catch (error) {
      console.error('[VisitorController.findAll] Error:', error);
      res.status(500).json({ error: 'Falha ao buscar visitantes.' });
    }
  }

  async findById(req: Request, res: Response): Promise<void> {
    try {
      const id = this.getIdParam(req.params.id);
      if (!id) {
        res.status(400).json({ error: 'ID é obrigatório.' });
        return;
      }

      const visitor = await visitorService.findById(id);
      if (!visitor) {
        res.status(404).json({ error: 'Visitante não encontrado.' });
        return;
      }

      res.status(200).json(visitor);
    } catch (error) {
      console.error('[VisitorController.findById] Error:', error);
      res.status(500).json({ error: 'Falha ao obter visitante.' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const id = this.getIdParam(req.params.id);
      if (!id) {
        res.status(400).json({ error: 'ID é obrigatório.' });
        return;
      }

      const updatedVisitor = await visitorService.update(id, req.body);
      res.status(200).json(updatedVisitor);
    } catch (error: any) {
      console.error('[VisitorController.update] Error:', error);
      res.status(400).json({ error: error.message || 'Falha ao atualizar visitante.' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = this.getIdParam(req.params.id);
      if (!id) {
        res.status(400).json({ error: 'ID é obrigatório.' });
        return;
      }

      await visitorService.delete(id);
      res.status(204).send();
    } catch (error) {
      console.error('[VisitorController.delete] Error:', error);
      res.status(500).json({ error: 'Falha ao remover visitante.' });
    }
  }
}

export const visitorController = new VisitorController();
