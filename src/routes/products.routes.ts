import { Router } from 'express';
import { query, param, body } from 'express-validator';
import { authMiddleware } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';
import { validate } from '../utils/validate';
import productsController from '../controllers/products.controller';
import productImagesController from '../controllers/product-images.controller';

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

// GET /api/products/:id/reviews - Buscar avaliações de um produto
import reviewsController from '../controllers/reviews.controller';
router.get(
  '/:id/reviews',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
  ]),
  reviewsController.getByProduct
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

// ===== PRODUCT IMAGES ROUTES =====

// POST /api/products/:productId/images - Adicionar imagem ao produto
router.post(
  '/:productId/images',
  upload.single('image'),
  validate([
    param('productId').isUUID().withMessage('ID do produto inválido'),
    body('alt').optional().isString(),
    body('order').optional().toInt().isInt({ min: 0 }),
  ]),
  productImagesController.create
);

// POST /api/products/:productId/images/bulk - Adicionar múltiplas imagens
router.post(
  '/:productId/images/bulk',
  upload.array('images', 10),
  validate([
    param('productId').isUUID().withMessage('ID do produto inválido'),
  ]),
  productImagesController.createBulk
);

// GET /api/products/:productId/images - Listar imagens do produto
router.get(
  '/:productId/images',
  validate([
    param('productId').isUUID().withMessage('ID do produto inválido'),
  ]),
  productImagesController.list
);

// PUT /api/products/:productId/images/reorder - Reordenar imagens
router.put(
  '/:productId/images/reorder',
  validate([
    param('productId').isUUID(),
    body('imageIds').isArray({ min: 1 }).withMessage('imageIds deve ser um array não vazio'),
    body('imageIds.*').isUUID().withMessage('Todos os IDs devem ser UUIDs válidos'),
  ]),
  productImagesController.reorder
);

// PUT /api/products/:productId/images/:imageId - Atualizar imagem
router.put(
  '/:productId/images/:imageId',
  validate([
    param('productId').isUUID(),
    param('imageId').isUUID(),
    body('alt').optional().isString(),
    body('order').optional().toInt().isInt({ min: 0 }),
  ]),
  productImagesController.update
);

// DELETE /api/products/:productId/images/:imageId - Deletar imagem
router.delete(
  '/:productId/images/:imageId',
  validate([
    param('productId').isUUID(),
    param('imageId').isUUID(),
  ]),
  productImagesController.delete
);

export default router;
