import { Router } from 'express';
import { param, body, query } from 'express-validator';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../utils/validate';
import promotionsController from '../controllers/promotions.controller';

const router = Router();

// ============================================
// ROTAS PÚBLICAS - Cliente visualizar promoções
// ============================================

// GET /api/promotions - Listar promoções ativas (PÚBLICA)
router.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('active').optional().isBoolean(),
  ]),
  promotionsController.list
);

// GET /api/promotions/product/:productId/active - Promoção ativa do produto (PÚBLICA)
router.get(
  '/product/:productId/active',
  validate([
    param('productId').isUUID().withMessage('ID do produto inválido'),
  ]),
  promotionsController.getActiveByProduct
);

// GET /api/promotions/:id - Detalhes da promoção (PÚBLICA)
router.get(
  '/:id',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
  ]),
  promotionsController.getById
);

// ============================================
// ROTAS ADMIN - Gestão de promoções
// ============================================

router.use(authMiddleware);
router.use(adminMiddleware);

// POST /api/promotions - Criar promoção (ADMIN)
router.post(
  '/',
  validate([
    body('productId').isUUID().withMessage('ID do produto inválido'),
    body('name').notEmpty().withMessage('Nome da promoção obrigatório'),
    body('startDate').isISO8601().withMessage('Data de início inválida'),
    body('endDate').isISO8601().withMessage('Data de fim inválida'),
    body('discountPercent').optional().isFloat({ min: 0, max: 100 }),
    body('discountAmount').optional().isFloat({ min: 0 }),
  ]),
  promotionsController.create
);

// PUT /api/promotions/:id - Atualizar promoção (ADMIN)
router.put(
  '/:id',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
    body('name').optional().notEmpty(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('active').optional().isBoolean(),
  ]),
  promotionsController.update
);

// DELETE /api/promotions/:id - Deletar promoção (ADMIN)
router.delete(
  '/:id',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
  ]),
  promotionsController.delete
);

export default router;
