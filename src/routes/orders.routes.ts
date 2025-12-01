import { Router } from 'express';
import { query, param, body } from 'express-validator';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../utils/validate';
import ordersController from '../controllers/orders.controller';

const router = Router();

// Todas as rotas precisam de autenticação
router.use(authMiddleware);

// GET /api/orders - Listar pedidos com filtros
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

// GET /api/orders/stats - Estatísticas do dashboard
router.get('/stats', ordersController.stats);

// GET /api/orders/:id - Detalhes de um pedido
router.get(
  '/:id',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
  ]),
  ordersController.getById
);

// PUT /api/orders/:id - Atualizar pedido (status e tracking)
router.put(
  '/:id',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
    body('status').optional().isIn(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
    body('trackingCode').optional().isString(),
    body('notes').optional().isString(),
  ]),
  ordersController.update
);

// POST /api/orders - Criar novo pedido (opcional, caso queira criar manualmente)
router.post(
  '/',
  validate([
    body('customerName').notEmpty().withMessage('Nome do cliente obrigatório'),
    body('customerEmail').optional().isEmail(),
    body('items').isArray({ min: 1 }).withMessage('Items obrigatórios'),
    body('total').isFloat({ min: 0 }).withMessage('Total inválido'),
  ]),
  ordersController.create
);

export default router;
