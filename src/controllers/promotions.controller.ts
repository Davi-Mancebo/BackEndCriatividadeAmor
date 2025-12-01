import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import promotionsService from '../services/promotions.service';

class PromotionsController {
  async create(req: AuthRequest, res: Response) {
    try {
      const { productId, name, discountPercent, discountAmount, startDate, endDate } = req.body;

      const result = await promotionsService.create({
        productId,
        name,
        discountPercent,
        discountAmount,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });

      res.status(201).json(result);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({
        error: error.message || 'Erro ao criar promoção'
      });
    }
  }

  async list(req: AuthRequest, res: Response) {
    try {
      const { active, productId } = req.query;

      const promotions = await promotionsService.list({
        active: active === 'true',
        productId: productId as string | undefined,
      });

      res.json(promotions);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        error: error.message || 'Erro ao listar promoções'
      });
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const promotion = await promotionsService.getById(req.params.id);
      res.json(promotion);
    } catch (error: any) {
      res.status(error.statusCode || 404).json({
        error: error.message || 'Promoção não encontrada'
      });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { name, startDate, endDate, active, discountPercent, discountAmount } = req.body;

      const updatedPromotion = await promotionsService.update(req.params.id, {
        name,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        active,
        discountPercent,
        discountAmount,
      });

      res.json(updatedPromotion);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({
        error: error.message || 'Erro ao atualizar promoção'
      });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const result = await promotionsService.delete(req.params.id);
      res.json(result);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({
        error: error.message || 'Erro ao deletar promoção'
      });
    }
  }

  async getActiveByProduct(req: AuthRequest, res: Response) {
    try {
      const { productId } = req.params;
      const result = await promotionsService.getActiveByProduct(productId);
      res.json(result);
    } catch (error: any) {
      res.status(error.statusCode || 404).json({
        error: error.message || 'Erro ao buscar promoções do produto'
      });
    }
  }
}

export default new PromotionsController();
