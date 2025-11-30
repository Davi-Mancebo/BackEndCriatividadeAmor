import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { validate } from '../utils/validate';
import { AppError } from '../middlewares/error.middleware';

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
  async (req: Request, res: Response) => {
    const { orderId, payerEmail, payerName, payerDocument } = req.body;

    // Buscar pedido
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppError('Pedido não encontrado', 404);
    }

    // Verificar se já existe pagamento para este pedido
    const existingPayment = await prisma.payment.findUnique({
      where: { orderId },
    });

    if (existingPayment && existingPayment.status === 'APPROVED') {
      throw new AppError('Pedido já foi pago', 400);
    }

    // Aqui você integraria com o Mercado Pago
    // const mercadoPagoResponse = await createMercadoPagoPreference(order);

    // Por enquanto, criar registro de pagamento pendente
    const payment = await prisma.payment.create({
      data: {
        orderId,
        amount: order.total,
        method: 'PIX', // Será definido depois que o usuário escolher
        status: 'PENDING',
        payerEmail,
        payerName,
        payerDocument,
        // preferenceId: mercadoPagoResponse.id, // ID retornado pelo MP
      },
    });

    // Atualizar status do pedido
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'PAYMENT_PENDING' },
    });

    res.status(201).json({
      payment,
      // initPoint: mercadoPagoResponse.init_point, // URL para redirecionar
      // sandboxInitPoint: mercadoPagoResponse.sandbox_init_point,
      message: 'Pagamento criado. Aguardando confirmação.',
    });
  }
);

// POST /api/payments/webhook - Webhook do Mercado Pago
router.post(
  '/webhook',
  async (req: Request, res: Response) => {
    try {
      const { type, data } = req.body;

      console.log('📨 Webhook recebido:', { type, data });

      // Mercado Pago envia notificações de diferentes tipos
      if (type === 'payment') {
        const paymentId = data.id;

        // Aqui você buscaria os dados completos do pagamento no MP
        // const mpPayment = await getMercadoPagoPayment(paymentId);

        // Buscar pagamento no banco pelo mercadoPagoId
        const payment = await prisma.payment.findUnique({
          where: { mercadoPagoId: paymentId },
          include: { order: true },
        });

        if (!payment) {
          console.log('⚠️ Pagamento não encontrado:', paymentId);
          return res.status(200).json({ received: true });
        }

        // Atualizar status baseado na resposta do MP
        // const newStatus = mapMercadoPagoStatus(mpPayment.status);

        await prisma.$transaction(async (tx: any) => {
          // Atualizar pagamento
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: 'APPROVED', // Seria: newStatus
              mercadoPagoStatus: 'approved', // Seria: mpPayment.status
              approvedAt: new Date(),
              // transactionAmount: mpPayment.transaction_amount,
              // netAmount: mpPayment.transaction_details.net_received_amount,
              // feeAmount: mpPayment.fee_details[0]?.amount,
              webhookData: req.body,
            },
          });

          // Atualizar status do pedido
          const updatedOrder = await tx.order.update({
            where: { id: payment.orderId },
            data: {
              status: 'PAID', // Pedido confirmado
            },
          });

          // Criar registro no histórico de compras para cada item
          const items = updatedOrder.items as any[];
          for (const item of items) {
            await tx.purchaseHistory.create({
              data: {
                orderId: updatedOrder.id,
                customerEmail: updatedOrder.customerEmail || payment.payerEmail!,
                customerName: updatedOrder.customerName,
                productId: item.productId,
                productTitle: item.title,
                pricePaid: item.price * item.quantity,
              },
            });
          }

          // Criar notificação
          const admin = await tx.user.findFirst({
            where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
          });

          if (admin) {
            await tx.notification.create({
              data: {
                userId: admin.id,
                type: 'NEW_ORDER',
                title: 'Pagamento confirmado',
                message: `Pedido ${payment.order.orderNumber} foi pago por ${updatedOrder.customerName}`,
                data: { orderId: payment.orderId, paymentId: payment.id },
              },
            });
          }
        });

        console.log('✅ Pagamento processado:', payment.id);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('❌ Erro no webhook:', error);
      res.status(500).json({ error: 'Erro ao processar webhook' });
    }
  }
);

// GET /api/payments/status/:orderId - Verificar status do pagamento (público)
router.get(
  '/status/:orderId',
  validate([
    param('orderId').isUUID().withMessage('ID do pedido inválido'),
  ]),
  async (req: Request, res: Response) => {
    const { orderId } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { orderId },
      include: {
        order: {
          select: {
            orderNumber: true,
            status: true,
            total: true,
          },
        },
      },
    });

    if (!payment) {
      throw new AppError('Pagamento não encontrado', 404);
    }

    res.json({
      payment: {
        id: payment.id,
        status: payment.status,
        method: payment.method,
        amount: payment.amount,
        approvedAt: payment.approvedAt,
      },
      order: payment.order,
    });
  }
);

// ============================================
// ROTAS ADMIN (com autenticação)
// ============================================

router.use(authMiddleware);

// GET /api/payments - Listar pagamentos
router.get('/', async (req: AuthRequest, res: Response) => {
  const { status, method, page = 1, limit = 20 } = req.query;

  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (method) {
    where.method = method;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        order: {
          select: {
            orderNumber: true,
            customerName: true,
            customerEmail: true,
          },
        },
      },
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.payment.count({ where }),
  ]);

  res.json({
    payments,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

// GET /api/payments/:id - Detalhes do pagamento
router.get(
  '/:id',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
  ]),
  async (req: AuthRequest, res: Response) => {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: {
        order: true,
      },
    });

    if (!payment) {
      throw new AppError('Pagamento não encontrado', 404);
    }

    res.json(payment);
  }
);

// POST /api/payments/:id/refund - Solicitar reembolso
router.post(
  '/:id/refund',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
    body('reason').optional().isString(),
  ]),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!payment) {
      throw new AppError('Pagamento não encontrado', 404);
    }

    if (payment.status !== 'APPROVED') {
      throw new AppError('Apenas pagamentos aprovados podem ser reembolsados', 400);
    }

    // Aqui você chamaria a API do Mercado Pago para reembolso
    // const refund = await refundMercadoPagoPayment(payment.mercadoPagoId);

    await prisma.$transaction(async (tx) => {
      // Atualizar pagamento
      await tx.payment.update({
        where: { id },
        data: {
          status: 'REFUNDED',
          refundedAt: new Date(),
        },
      });

      // Atualizar pedido
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: 'REFUNDED',
          notes: reason || 'Reembolso solicitado',
        },
      });
    });

    res.json({
      message: 'Reembolso processado com sucesso',
      payment: await prisma.payment.findUnique({ where: { id } }),
    });
  }
);

// GET /api/payments/stats - Estatísticas de pagamentos
router.get('/stats/overview', async (req: AuthRequest, res: Response) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalPayments,
    pendingPayments,
    approvedPayments,
    monthRevenue,
    paymentsByMethod,
  ] = await Promise.all([
    prisma.payment.count(),
    prisma.payment.count({ where: { status: 'PENDING' } }),
    prisma.payment.count({ where: { status: 'APPROVED' } }),
    prisma.payment.aggregate({
      where: {
        status: 'APPROVED',
        createdAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
    }),
    prisma.payment.groupBy({
      by: ['method'],
      _count: true,
      _sum: { amount: true },
      where: { status: 'APPROVED' },
    }),
  ]);

  res.json({
    overview: {
      totalPayments,
      pendingPayments,
      approvedPayments,
      monthRevenue: monthRevenue._sum.amount || 0,
    },
    paymentsByMethod: paymentsByMethod.map((item: any) => ({
      method: item.method,
      count: item._count,
      total: item._sum.amount,
    })),
  });
});

export default router;
