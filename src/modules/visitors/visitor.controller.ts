import { Request, Response } from 'express';
import { visitorService } from './visitor.service';
import { MESSAGES } from '../../constants/messages';
import { handleApiError } from '../../utils/errorHandler';
import { logAuditEvent } from '../../utils/logger';

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
        res.status(400).json({ error: MESSAGES.ERRORS.REQUIRED_FIELDS });
        return;
      }

      const isSuperAdmin = req.user?.roles?.includes('SUPER_ADMIN');
      const congregationId = (isSuperAdmin && req.body.congregationId)
        ? req.body.congregationId
        : req.user?.congregationId;

      const visitor = await visitorService.create({
        ...req.body,
        registeredById: req.user?.id,
        congregationId
      });

      logAuditEvent('VISITOR_REGISTERED', {
        userId: req.user?.id,
        congregationId,
        details: { visitorId: visitor.id, fullName: visitor.fullName }
      });

      res.status(201).json(visitor);
    } catch (error: any) {
      handleApiError(res, error, MESSAGES.ERRORS.VISITOR_REGISTER_FAILED);
    }
  }

  async findAll(req: Request, res: Response): Promise<void> {
    try {
      const { search, neighborhood, wantsToJoinGC, congregationId: queryCongregationId } = req.query;
      const isSuperAdmin = req.user?.roles?.includes('SUPER_ADMIN');

      let targetCongregationId: string | undefined = undefined;

      if (isSuperAdmin) {
        if (queryCongregationId && typeof queryCongregationId === 'string' && queryCongregationId !== 'ALL') {
          targetCongregationId = queryCongregationId;
        }
      } else {
        targetCongregationId = req.user?.congregationId || undefined;
      }

      const visitors = await visitorService.findAll({
        search: typeof search === 'string' ? search : undefined,
        neighborhood: typeof neighborhood === 'string' ? neighborhood : undefined,
        wantsToJoinGC: wantsToJoinGC === 'true' ? true : wantsToJoinGC === 'false' ? false : undefined,
        congregationId: targetCongregationId
      });

      res.status(200).json(visitors);
    } catch (error) {
      handleApiError(res, error, MESSAGES.ERRORS.VISITOR_FETCH_FAILED);
    }
  }

  async findById(req: Request, res: Response): Promise<void> {
    try {
      const id = this.getIdParam(req.params.id);
      if (!id) {
        res.status(400).json({ error: MESSAGES.ERRORS.INVALID_ID });
        return;
      }

      const visitor = await visitorService.findById(id);
      if (!visitor) {
        res.status(404).json({ error: MESSAGES.ERRORS.VISITOR_NOT_FOUND });
        return;
      }

      res.status(200).json(visitor);
    } catch (error) {
      handleApiError(res, error, MESSAGES.ERRORS.VISITOR_FETCH_FAILED);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const id = this.getIdParam(req.params.id);
      if (!id) {
        res.status(400).json({ error: MESSAGES.ERRORS.INVALID_ID });
        return;
      }

      const updatedVisitor = await visitorService.update(id, req.body);
      res.status(200).json(updatedVisitor);
    } catch (error: any) {
      handleApiError(res, error, MESSAGES.ERRORS.VISITOR_UPDATE_FAILED);
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = this.getIdParam(req.params.id);
      if (!id) {
        res.status(400).json({ error: MESSAGES.ERRORS.INVALID_ID });
        return;
      }

      await visitorService.delete(id);
      res.status(204).send();
    } catch (error) {
      handleApiError(res, error, MESSAGES.ERRORS.VISITOR_DELETE_FAILED);
    }
  }
}

export const visitorController = new VisitorController();
