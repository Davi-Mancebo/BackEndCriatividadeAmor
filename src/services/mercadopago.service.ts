// Serviço para integração com Mercado Pago
// Documentação: https://www.mercadopago.com.br/developers/pt/docs

import { AppError } from '../middlewares/error.middleware';

// Tipos
interface MercadoPagoItem {
  id: string;
  title: string;
  description: string;
  picture_url?: string;
  category_id: string;
  quantity: number;
  unit_price: number;
}

interface MercadoPagoPreferenceData {
  items: MercadoPagoItem[];
  payer: {
    name: string;
    email: string;
    phone?: {
      number: number;
    };
  };
  back_urls: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return: string;
  external_reference: string;
  notification_url: string;
  statement_descriptor: string;
  payment_methods: {
    excluded_payment_methods: any[];
    excluded_payment_types: any[];
    installments: number;
  };
  shipments: {
    cost: number;
    mode: string;
  };
}

export class MercadoPagoService {
  private mercadopago: any;
  private isConfigured: boolean = false;
  private backUrlBase: string;
  private notificationUrl: string;

  constructor() {
    this.backUrlBase = process.env.FRONTEND_URL || 'http://localhost:5173';
    const backendBase = process.env.BACKEND_PUBLIC_URL
      || process.env.BACKEND_URL
      || 'http://localhost:3333';
    this.notificationUrl = `${backendBase.replace(/\/$/, '')}/api/payments/webhook`;
    this.initialize();
  }

  // Inicializar SDK (só se tiver credenciais)
  private initialize() {
    try {
      const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      
      if (!accessToken) {
        console.warn('⚠️ MERCADO_PAGO_ACCESS_TOKEN não configurado. Pagamentos desabilitados.');
        return;
      }

      // Importação dinâmica para não quebrar se não tiver instalado
      const mercadopago = require('mercadopago');
      
      mercadopago.configure({
        access_token: accessToken,
      });

      this.mercadopago = mercadopago;
      this.isConfigured = true;
      console.log('✅ Mercado Pago configurado');
    } catch (error) {
      console.warn('⚠️ SDK Mercado Pago não instalado. Execute: npm install mercadopago');
    }
  }

  // Verificar se está configurado
  private checkConfiguration() {
    if (!this.isConfigured) {
      throw new AppError(
        'Mercado Pago não configurado. Verifique as credenciais no .env',
        500
      );
    }
  }

  // Criar preferência de pagamento
  async createPreference(order: any): Promise<any> {
    this.checkConfiguration();

    const preference: MercadoPagoPreferenceData = {
      items: order.items.map((item: any, index: number) => {
        const fallbackTitle = `Produto ${index + 1}`;
        const title = item?.title || item?.name || item?.productName || fallbackTitle;
        const picture = item?.image || item?.picture_url || item?.cover;
        const unitPrice = typeof item?.price === 'number' ? item.price : Number(item?.price) || 0;

        if (!title) {
          console.warn('[MercadoPago] Item sem título detectado', { orderId: order.id, index });
        }

        return {
          id: item?.productId || `item-${index}`,
          title,
          description: title,
          picture_url: picture,
          category_id: 'art',
          quantity: item?.quantity || 1,
          unit_price: unitPrice,
        };
      }),
      payer: {
        name: order.customerName,
        email: order.customerEmail,
        phone: (() => {
          if (!order.customerPhone) {
            return undefined;
          }

          const numericPhone = String(order.customerPhone).replace(/\D/g, '');
          if (!numericPhone) {
            return undefined;
          }

          return {
            number: Number(numericPhone),
          };
        })(),
      },
      back_urls: {
        success: `${this.backUrlBase}/payment/success`,
        failure: `${this.backUrlBase}/payment/failure`,
        pending: `${this.backUrlBase}/payment/pending`,
      },
      auto_return: 'approved',
      external_reference: order.id,
      notification_url: this.notificationUrl,
      statement_descriptor: 'Criatividade com Amor',
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12,
      },
      shipments: {
        cost: order.shipping,
        mode: 'not_specified',
      },
    };

    try {
      const response = await this.mercadopago.preferences.create(preference);
      return response.body;
    } catch (error: any) {
      console.error('Erro ao criar preferência MP:', error);
      throw new AppError(
        `Erro ao criar pagamento: ${error.message}`,
        500
      );
    }
  }

  // Buscar detalhes do pagamento
  async getPayment(paymentId: string): Promise<any> {
    this.checkConfiguration();

    try {
      const response = await this.mercadopago.payment.get(paymentId);
      return response.body;
    } catch (error: any) {
      console.error('Erro ao buscar pagamento MP:', error);
      throw new AppError(
        `Erro ao buscar pagamento: ${error.message}`,
        500
      );
    }
  }

  // Processar reembolso
  async refundPayment(paymentId: string, amount?: number): Promise<any> {
    this.checkConfiguration();

    try {
      const refund = await this.mercadopago.refund.create({
        payment_id: parseInt(paymentId),
        amount,
      });
      return refund.body;
    } catch (error: any) {
      console.error('Erro ao processar reembolso MP:', error);
      throw new AppError(
        `Erro ao processar reembolso: ${error.message}`,
        500
      );
    }
  }

  // Mapear status do Mercado Pago para nosso sistema
  mapStatus(mpStatus: string): string {
    const statusMap: Record<string, string> = {
      pending: 'PENDING',
      approved: 'APPROVED',
      authorized: 'APPROVED',
      in_process: 'PROCESSING',
      in_mediation: 'PROCESSING',
      rejected: 'REJECTED',
      cancelled: 'CANCELLED',
      refunded: 'REFUNDED',
      charged_back: 'REFUNDED',
    };

    return statusMap[mpStatus] || 'PENDING';
  }

  // Verificar assinatura do webhook (Segurança)
  verifyWebhook(xSignature: string, xRequestId: string, dataId: string): boolean {
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    
    if (!secret) {
      console.warn('⚠️ MERCADO_PAGO_WEBHOOK_SECRET não configurado');
      return true; // Dev mode - aceita qualquer webhook
    }

    try {
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(`${xRequestId}${dataId}`);
      const hash = hmac.digest('hex');

      return hash === xSignature;
    } catch (error) {
      console.error('Erro ao verificar webhook:', error);
      return false;
    }
  }
}

export default new MercadoPagoService();
