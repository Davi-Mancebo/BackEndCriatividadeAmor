import { Router } from 'express';
import { body, param } from 'express-validator';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../utils/validate';
import paymentController from '../controllers/payment.controller';
import 'express-async-errors';

const router = Router();

// ============================================
// ROTAS PÚBLICAS (sem autenticação)
// ============================================

// POST /api/payments/create - Criar pagamento (chamado pelo frontend do cliente)
router.post(
  '/create',
  validate([
    body('orderId').isUUID().withMessage('ID do pedido inválido'),
    body('payerEmail').isEmail().withMessage('Email inválido'),
    body('payerName').notEmpty().withMessage('Nome obrigatório'),
  ]),
  paymentController.create.bind(paymentController)
);

// POST /api/payments/webhook - Webhook do Mercado Pago
router.post(
  '/webhook',
  paymentController.webhook.bind(paymentController)
);

// GET /api/payments/status/:orderId - Verificar status do pagamento (público)
router.get(
  '/status/:orderId',
  validate([
    param('orderId').isUUID().withMessage('ID do pedido inválido'),
  ]),
  paymentController.getStatus.bind(paymentController)
);

// ============================================
// ROTAS ADMIN (com autenticação)
// ============================================

router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/payments - Listar pagamentos
router.get(
  '/',
  paymentController.list.bind(paymentController)
);

// GET /api/payments/:id - Detalhes do pagamento
router.get(
  '/:id',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
  ]),
  paymentController.getById.bind(paymentController)
);

// POST /api/payments/:id/refund - Solicitar reembolso
router.post(
  '/:id/refund',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
    body('reason').optional().isString(),
  ]),
  paymentController.refund.bind(paymentController)
);

// GET /api/payments/stats - Estatísticas de pagamentos
router.get(
  '/stats/overview',
  paymentController.stats.bind(paymentController)
);

export default router;
