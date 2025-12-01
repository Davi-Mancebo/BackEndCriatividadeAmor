import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import promotionsService from '../services/promotions.service';

class PromotionsController {
  async create(req: AuthRequest, res: Response) {
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
  }

  async list(req: AuthRequest, res: Response) {
    const { active, productId } = req.query;

    const promotions = await promotionsService.list({
      active: active === 'true',
      productId: productId as string | undefined,
    });

    res.json(promotions);
  }

  async getById(req: AuthRequest, res: Response) {
    const promotion = await promotionsService.getById(req.params.id);
    res.json(promotion);
  }

  async update(req: AuthRequest, res: Response) {
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
  }

  async delete(req: AuthRequest, res: Response) {
    const result = await promotionsService.delete(req.params.id);
    res.json(result);
  }

  async getActiveByProduct(req: AuthRequest, res: Response) {
    const { productId } = req.params;
    const result = await promotionsService.getActiveByProduct(productId);
    res.json(result);
  }
}

export default new PromotionsController();
