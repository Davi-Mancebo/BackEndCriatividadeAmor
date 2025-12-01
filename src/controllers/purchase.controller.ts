import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import purchaseService from '../services/purchase.service';
import { AppError } from '../middlewares/error.middleware';

export class PurchaseController {
  // Listar produtos comprados (público)
  async getMyProducts(req: AuthRequest, res: Response) {
    const { email } = req.query;

    if (!email) {
      throw new AppError('Email obrigatório', 400);
    }

    const result = await purchaseService.getCustomerPurchases(email as string);
    res.json(result);
  }

  // Verificar compra (público)
  async verify(req: AuthRequest, res: Response) {
    const { email, productId } = req.query;

    if (!email || !productId) {
      throw new AppError('Email e productId obrigatórios', 400);
    }

    const result = await purchaseService.verifyPurchase(
      email as string,
      productId as string
    );

    res.json(result);
  }
}

export default new PurchaseController();
