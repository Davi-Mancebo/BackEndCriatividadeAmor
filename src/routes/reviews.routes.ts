import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authMiddleware, adminMiddleware, customerAuthMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../utils/validate';
import reviewsController from '../controllers/reviews.controller';

const router = Router();

// Rota de buscar avaliações de um produto está em products.routes.ts (GET /api/products/:id/reviews)

// ============================================
// ROTAS PÚBLICAS - Cliente criar avaliação
// ============================================

// POST /api/reviews - Criar avaliação (PÚBLICA - cliente usa email)
router.post(
  '/',
  customerAuthMiddleware,
  validate([
    body('productId').isUUID().withMessage('ID do produto inválido'),
    body('customerEmail').optional().isEmail().withMessage('Email inválido'),
    body('customerName').optional().isString(),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating deve ser entre 1 e 5'),
    body('comment').optional().isString(),
  ]),
  reviewsController.create
);

// GET /api/reviews/me/:productId - Buscar avaliação do cliente autenticado
router.get(
  '/me/:productId',
  customerAuthMiddleware,
  validate([
    param('productId').isUUID().withMessage('ID do produto inválido'),
  ]),
  reviewsController.getOwnReview
);

// PUT /api/reviews/me/:productId - Atualizar avaliação do cliente autenticado
router.put(
  '/me/:productId',
  customerAuthMiddleware,
  validate([
    param('productId').isUUID().withMessage('ID do produto inválido'),
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating deve ser entre 1 e 5'),
    body('comment').optional().isString(),
  ]),
  reviewsController.updateOwnReview
);

// ============================================
// ROTAS ADMIN - Gestão de avaliações
// ============================================

router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/reviews - Listar todas as avaliações (admin)
router.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('verified').optional().isBoolean(),
    query('productId').optional().isUUID(),
  ]),
  reviewsController.list
);

// PUT /api/reviews/:id - Atualizar/verificar avaliação (admin)
router.put(
  '/:id',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
    body('verified').optional().isBoolean(),
    body('adminResponse').optional().isString(),
  ]),
  reviewsController.update
);

// DELETE /api/reviews/:id - Deletar avaliação (admin)
router.delete(
  '/:id',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
  ]),
  reviewsController.delete
);

export default router;
