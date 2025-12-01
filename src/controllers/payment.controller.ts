import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import paymentService from '../services/payment.service';
import mercadoPagoService from '../services/mercadopago.service';
import prisma from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';

export class PaymentController {
  // Criar pagamento (público)
  async create(req: Request, res: Response) {
    try {
      const { orderId, payerEmail, payerName, payerDocument } = req.body;

      // Buscar pedido
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new AppError('Pedido não encontrado', 404);
      }

      // Criar preferência no Mercado Pago
      let preference;
      try {
        preference = await mercadoPagoService.createPreference(order);
      } catch (error: any) {
        console.error('Erro ao criar preferência:', error);
        throw new AppError('Erro ao processar pagamento. Tente novamente.', 500);
      }

      // Criar registro de pagamento
      const payment = await paymentService.createPayment({
        orderId,
        amount: order.total,
        payerEmail,
        payerName,
        payerDocument,
        preferenceId: preference.id,
      });

      // Atualizar status do pedido
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'PAYMENT_PENDING' },
      });

      res.status(201).json({
        payment,
        initPoint: preference.init_point,
        sandboxInitPoint: preference.sandbox_init_point,
        message: 'Pagamento criado. Aguardando confirmação.',
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        error: error.message || 'Erro ao criar pagamento'
      });
    }
  }

  // Webhook do Mercado Pago (público)
  async webhook(req: Request, res: Response) {
    try {
      const { type, data } = req.body;

      console.log('📨 Webhook recebido:', { type, data });

      // Validar tipo de notificação
      if (type !== 'payment') {
        return res.status(200).json({ received: true });
      }

      const paymentId = data.id;

      // Buscar dados do pagamento no MP
      let mpPayment;
      try {
        mpPayment = await mercadoPagoService.getPayment(paymentId);
      } catch (error) {
        console.error('Erro ao buscar pagamento MP:', error);
        return res.status(200).json({ received: true });
      }

      // Buscar pagamento no banco
      const payment = await paymentService.getPaymentByMercadoPagoId(paymentId);

      if (!payment) {
        console.log('⚠️ Pagamento não encontrado:', paymentId);
        return res.status(200).json({ received: true });
      }

      // Processar apenas se foi aprovado
      const newStatus = mercadoPagoService.mapStatus(mpPayment.status);

      if (newStatus === 'APPROVED') {
        await paymentService.processPaymentApproval(payment.id, req.body);
        console.log('✅ Pagamento processado:', payment.id);
      } else {
        // Atualizar apenas o status
        await paymentService.updatePaymentFromWebhook(payment.id, {
          status: newStatus,
          mercadoPagoStatus: mpPayment.status,
          webhookData: req.body,
        });
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('❌ Erro no webhook:', error);
      res.status(500).json({ error: 'Erro ao processar webhook' });
    }
  }

  // Verificar status do pagamento (público)
  async getStatus(req: Request, res: Response) {
    try {
      const { orderId } = req.params;

      const payment = await paymentService.getPaymentByOrderId(orderId);

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
    } catch (error: any) {
      res.status(error.statusCode || 404).json({
        error: error.message || 'Erro ao buscar status do pagamento'
      });
    }
  }

  // Listar pagamentos (admin)
  async list(req: AuthRequest, res: Response) {
    try {
      const { status, method, page, limit } = req.query;

      const result = await paymentService.listPayments({
        status: status as string,
        method: method as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.json(result);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        error: error.message || 'Erro ao listar pagamentos'
      });
    }
  }

  // Detalhes do pagamento (admin)
  async getById(req: AuthRequest, res: Response) {
    try {
      const payment = await paymentService.getPaymentById(req.params.id);

      if (!payment) {
        throw new AppError('Pagamento não encontrado', 404);
      }

      res.json(payment);
    } catch (error: any) {
      res.status(error.statusCode || 404).json({
        error: error.message || 'Erro ao buscar pagamento'
      });
    }
  }

  // Solicitar reembolso (admin)
  async refund(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      // Processar reembolso no Mercado Pago
      const payment = await paymentService.getPaymentById(id);

      if (payment?.mercadoPagoId) {
        try {
          await mercadoPagoService.refundPayment(payment.mercadoPagoId);
        } catch (error) {
          console.error('Erro ao processar reembolso no MP:', error);
        }
      }

      // Atualizar no banco
      const refundedPayment = await paymentService.requestRefund(id, reason);

      res.json({
        message: 'Reembolso processado com sucesso',
        payment: refundedPayment,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        error: error.message || 'Erro ao processar reembolso'
      });
    }
  }

  // Estatísticas (admin)
  async stats(req: AuthRequest, res: Response) {
    try {
      const stats = await paymentService.getPaymentStats();
      res.json(stats);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        error: error.message || 'Erro ao buscar estatísticas'
      });
    }
  }
}

export default new PaymentController();
