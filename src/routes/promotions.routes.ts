import { Router } from 'express';
import { param, body } from 'express-validator';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../utils/validate';
import promotionsController from '../controllers/promotions.controller';

const router = Router();

// Todas as rotas precisam de autenticação
router.use(authMiddleware);

// POST /api/promotions - Criar promoção
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

// GET /api/promotions - Listar promoções
router.get('/', promotionsController.list);

// GET /api/promotions/:id - Detalhes da promoção
router.get(
  '/:id',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
  ]),
  promotionsController.getById
);

// PUT /api/promotions/:id - Atualizar promoção
router.put(
  '/:id',
  validate([
    param('id').isUUID(),
    body('name').optional().notEmpty(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('active').optional().isBoolean(),
  ]),
  promotionsController.update
);

// DELETE /api/promotions/:id - Deletar promoção
router.delete(
  '/:id',
  validate([
    param('id').isUUID(),
  ]),
  promotionsController.delete
);

// GET /api/promotions/product/:productId/active - Promoção ativa do produto
router.get(
  '/product/:productId/active',
  validate([
    param('productId').isUUID(),
  ]),
  promotionsController.getActiveByProduct
);

export default router;
