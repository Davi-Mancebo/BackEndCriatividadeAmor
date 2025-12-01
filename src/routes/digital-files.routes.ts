import { Router } from 'express';
import { body, param } from 'express-validator';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';
import { validate } from '../utils/validate';
import digitalFileController from '../controllers/digital-file.controller';
import 'express-async-errors';

const router = Router();

// ============================================
// ROTAS PÚBLICAS - Download com validação de compra
// ============================================

// GET /api/digital-files/download/:productId - Baixar arquivos (se comprou)
router.get(
  '/download/:productId',
  validate([
    param('productId').isUUID().withMessage('ID do produto inválido'),
  ]),
  digitalFileController.download.bind(digitalFileController)
);

// GET /api/digital-files/check/:productId - Verificar se tem acesso
router.get(
  '/check/:productId',
  validate([
    param('productId').isUUID().withMessage('ID do produto inválido'),
  ]),
  digitalFileController.checkAccess.bind(digitalFileController)
);

// ============================================
// ROTAS ADMIN - Gerenciar arquivos digitais
// ============================================

router.use(authMiddleware);
router.use(adminMiddleware);

// POST /api/digital-files/:productId - Adicionar arquivo digital
router.post(
  '/:productId',
  upload.single('file'),
  validate([
    param('productId').isUUID().withMessage('ID do produto inválido'),
    body('name').notEmpty().withMessage('Nome do arquivo obrigatório'),
  ]),
  digitalFileController.create.bind(digitalFileController)
);

// GET /api/digital-files/:productId - Listar arquivos de um produto
router.get(
  '/:productId',
  validate([
    param('productId').isUUID().withMessage('ID do produto inválido'),
  ]),
  digitalFileController.list.bind(digitalFileController)
);

// PUT /api/digital-files/:fileId - Atualizar arquivo
router.put(
  '/:fileId',
  validate([
    param('fileId').isUUID().withMessage('ID do arquivo inválido'),
  ]),
  digitalFileController.update.bind(digitalFileController)
);

// DELETE /api/digital-files/:fileId - Deletar arquivo
router.delete(
  '/:fileId',
  validate([
    param('fileId').isUUID().withMessage('ID do arquivo inválido'),
  ]),
  digitalFileController.delete.bind(digitalFileController)
);

// GET /api/digital-files/stats - Estatísticas de downloads
router.get(
  '/stats/overview',
  digitalFileController.stats.bind(digitalFileController)
);

export default router;
