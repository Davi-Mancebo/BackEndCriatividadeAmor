import { Router } from 'express';
import { query, param, body } from 'express-validator';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../utils/validate';
import productsController from '../controllers/products.controller';

const router = Router();

// Todas as rotas precisam de autenticação
router.use(authMiddleware);

// GET /api/products - Listar produtos
router.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().isString(),
    query('search').optional().isString(),
    query('featured').optional().isBoolean(),
    query('active').optional().isBoolean(),
    query('sortBy').optional().isIn(['createdAt', 'price', 'sales', 'title']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ]),
  productsController.list
);

// GET /api/products/:id - Detalhes do produto
router.get(
  '/:id',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
  ]),
  productsController.getById
);

// POST /api/products - Criar produto
router.post(
  '/',
  validate([
    body('title').notEmpty().withMessage('Título obrigatório'),
    body('price').isFloat({ min: 0 }).withMessage('Preço inválido'),
    body('stock').optional().isInt({ min: 0 }),
    body('category').optional().isString(),
    body('description').optional().isString(),
  ]),
  productsController.create
);

// PUT /api/products/:id - Atualizar produto
router.put(
  '/:id',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
    body('title').optional().notEmpty(),
    body('price').optional().isFloat({ min: 0 }),
    body('stock').optional().isInt({ min: 0 }),
  ]),
  productsController.update
);

// DELETE /api/products/:id - Soft delete (desativar produto)
router.delete(
  '/:id',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
  ]),
  productsController.delete
);

// DELETE /api/products/:id/permanent - Hard delete (deletar permanentemente)
router.delete(
  '/:id/permanent',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
  ]),
  productsController.permanentDelete
);

export default router;
