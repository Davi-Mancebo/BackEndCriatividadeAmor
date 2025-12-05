import { Router } from 'express';
import { query, param, body } from 'express-validator';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../utils/validate';
import ordersController from '../controllers/orders.controller';
import { BRAZIL_MOBILE_REGEX, formatBrazilianCellPhone } from '../utils/phone';

const router = Router();

// ============================================
// ROTAS PÚBLICAS - Cliente criar pedido (checkout)
// ============================================

// POST /api/orders - Criar novo pedido (PÚBLICA - checkout)
router.post(
  '/',
  validate([
    body('customerName').notEmpty().withMessage('Nome do cliente obrigatório'),
    body('customerEmail').isEmail().withMessage('Email obrigatório'),
    body('customerPhone')
      .optional()
      .customSanitizer((value) => {
        const formatted = formatBrazilianCellPhone(value);
        return formatted ?? value;
      })
      .custom((value) => {
        if (value === undefined || value === null || value === '') {
          return true;
        }
        return BRAZIL_MOBILE_REGEX.test(value as string);
      })
      .withMessage('Telefone deve seguir o formato (XX) 9XXXX-XXXX'),
    body('shippingAddress').notEmpty().withMessage('Endereço de entrega obrigatório'),
    body('items').isArray({ min: 1 }).withMessage('Items obrigatórios'),
    body('items.*.productId').isUUID().withMessage('ID do produto inválido'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantidade inválida'),
    body('items.*.price').isFloat({ min: 0 }).withMessage('Preço inválido'),
    body('total').isFloat({ min: 0 }).withMessage('Total inválido'),
  ]),
  ordersController.create
);

// GET /api/orders/track/:id - Rastrear pedido (PÚBLICA - por email)
router.get(
  '/track/:id',
  validate([
    param('id').isUUID().withMessage('ID do pedido inválido'),
    query('email').isEmail().withMessage('Email obrigatório para rastreamento'),
  ]),
  ordersController.trackOrder
);

// GET /api/orders/my-orders - Meus pedidos por email (PÚBLICA)
router.get(
  '/my-orders',
  validate([
    query('email').isEmail().withMessage('Email obrigatório'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  ordersController.getMyOrders
);

// ============================================
// ROTAS ADMIN - Gestão de pedidos
// ============================================

router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/orders - Listar todos os pedidos com filtros (ADMIN)
router.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite inválido'),
    query('status').optional().isIn(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
    query('search').optional().isString(),
    query('sortBy').optional().isIn(['createdAt', 'total', 'customerName']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ]),
  ordersController.list
);

// GET /api/orders/stats - Estatísticas do dashboard (ADMIN)
router.get('/stats', ordersController.stats);

// GET /api/orders/:id - Detalhes completos de um pedido (ADMIN)
router.get(
  '/:id',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
  ]),
  ordersController.getById
);

// PUT /api/orders/:id - Atualizar pedido (status e tracking) (ADMIN)
router.put(
  '/:id',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
    body('status').optional().isIn(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'PAID', 'CANCELLED', 'REFUNDED']),
    body('trackingCode').optional().isString(),
    body('notes').optional().isString(),
  ]),
  ordersController.update
);

router.delete(
  '/:id',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
  ]),
  ordersController.delete
);

export default router;
