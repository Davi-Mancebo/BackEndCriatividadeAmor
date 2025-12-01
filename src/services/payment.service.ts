import prisma from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';

export class PaymentService {
  // Criar registro de pagamento
  async createPayment(data: {
    orderId: string;
    amount: number;
    payerEmail: string;
    payerName: string;
    payerDocument?: string;
    preferenceId?: string;
  }) {
    // Verificar se pedido existe
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
    });

    if (!order) {
      throw new AppError('Pedido não encontrado', 404);
    }

    // Verificar se já existe pagamento aprovado
    const existingPayment = await prisma.payment.findUnique({
      where: { orderId: data.orderId },
    });

    if (existingPayment && existingPayment.status === 'APPROVED') {
      throw new AppError('Pedido já foi pago', 400);
    }

    // Criar pagamento
    return await prisma.payment.create({
      data: {
        orderId: data.orderId,
        amount: data.amount,
        method: 'PIX', // Será atualizado após escolha do cliente
        status: 'PENDING',
        payerEmail: data.payerEmail,
        payerName: data.payerName,
        payerDocument: data.payerDocument,
        preferenceId: data.preferenceId,
      },
    });
  }

  // Buscar pagamento por Mercado Pago ID
  async getPaymentByMercadoPagoId(mercadoPagoId: string) {
    return await prisma.payment.findUnique({
      where: { mercadoPagoId },
      include: { order: true },
    });
  }

  // Atualizar pagamento após webhook
  async updatePaymentFromWebhook(paymentId: string, data: {
    status: string;
    mercadoPagoStatus: string;
    approvedAt?: Date;
    transactionAmount?: number;
    netAmount?: number;
    feeAmount?: number;
    webhookData: any;
  }) {
    return await prisma.payment.update({
      where: { id: paymentId },
      data: data as any,
    });
  }

  // Processar confirmação de pagamento
  async processPaymentApproval(paymentId: string, webhookData: any) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) {
      throw new AppError('Pagamento não encontrado', 404);
    }

    await prisma.$transaction(async (tx: any) => {
      // Atualizar pagamento
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'APPROVED',
          mercadoPagoStatus: 'approved',
          approvedAt: new Date(),
          webhookData,
        },
      });

      // Atualizar pedido
      const updatedOrder = await tx.order.update({
        where: { id: payment.orderId },
        data: { status: 'PAID' },
      });

      // Criar histórico de compras para cada item
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

      // Criar notificação para admin
      const admin = await tx.user.findFirst({
        where: { role: 'ADMIN' },
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

    return await this.getPaymentById(paymentId);
  }

  // Buscar pagamento por ID
  async getPaymentById(paymentId: string) {
    return await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
  }

  // Buscar pagamento por order ID
  async getPaymentByOrderId(orderId: string) {
    return await prisma.payment.findUnique({
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
  }

  // Listar pagamentos com filtros
  async listPayments(filters: {
    status?: string;
    method?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, method, page = 1, limit = 20 } = filters;

    const where: any = {};
    if (status) where.status = status;
    if (method) where.method = method;

    const skip = (page - 1) * limit;

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
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Solicitar reembolso
  async requestRefund(paymentId: string, reason?: string) {
    const payment = await this.getPaymentById(paymentId);

    if (!payment) {
      throw new AppError('Pagamento não encontrado', 404);
    }

    if (payment.status !== 'APPROVED') {
      throw new AppError('Apenas pagamentos aprovados podem ser reembolsados', 400);
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'REFUNDED',
          refundedAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: 'REFUNDED',
          notes: reason || 'Reembolso solicitado',
        },
      });
    });

    return await this.getPaymentById(paymentId);
  }

  // Estatísticas de pagamentos
  async getPaymentStats() {
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

    return {
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
    };
  }
}

export default new PaymentService();
