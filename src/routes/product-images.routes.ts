import { Router } from 'express';
import { param, body } from 'express-validator';
import { authMiddleware } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';
import { validate } from '../utils/validate';
import productImagesController from '../controllers/product-images.controller';

const router = Router();

// Todas as rotas precisam de autenticação
router.use(authMiddleware);

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
  upload.array('images', 10), // Máximo 10 imagens por vez
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

// PUT /api/products/:productId/images/reorder - Reordenar imagens
router.put(
  '/:productId/images/reorder',
  authMiddleware,
  validate([
    param('productId').isUUID(),
    body('imageIds').isArray({ min: 1 }).withMessage('imageIds deve ser um array não vazio'),
    body('imageIds.*').isUUID().withMessage('Todos os IDs devem ser UUIDs válidos'),
  ]),
  productImagesController.reorder
);

export default router;
