import { Router } from 'express';
import { validate } from '../utils/validate';
import purchaseController from '../controllers/purchase.controller';
import 'express-async-errors';

const router = Router();

// ============================================
// ROTAS PÚBLICAS - Cliente consulta suas compras
// ============================================

// GET /api/purchases/my-products - Listar produtos comprados pelo email
router.get(
  '/my-products',
  purchaseController.getMyProducts.bind(purchaseController)
);

// GET /api/purchases/verify - Verificar se email comprou produto específico
router.get(
  '/verify',
  purchaseController.verify.bind(purchaseController)
);

export default router;
