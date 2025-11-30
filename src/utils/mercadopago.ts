// Utilitário para integração com Mercado Pago
// Documentação: https://www.mercadopago.com.br/developers/pt/docs

// Instalar: npm install mercadopago

import mercadopago from 'mercadopago';

// Configurar credenciais (colocar no .env)
mercadopago.configure({
  access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
});

// ============================================
// CRIAR PREFERÊNCIA DE PAGAMENTO
// ============================================
export async function createMercadoPagoPreference(order: any) {
  const preference = {
    items: order.items.map((item: any) => ({
      id: item.productId,
      title: item.title,
      description: item.title,
      picture_url: item.image,
      category_id: 'art',
      quantity: item.quantity,
      unit_price: item.price,
    })),
    payer: {
      name: order.customerName,
      email: order.customerEmail,
      phone: {
        number: order.customerPhone,
      },
    },
    back_urls: {
      success: `${process.env.FRONTEND_URL}/payment/success`,
      failure: `${process.env.FRONTEND_URL}/payment/failure`,
      pending: `${process.env.FRONTEND_URL}/payment/pending`,
    },
    auto_return: 'approved',
    external_reference: order.id, // Seu ID interno do pedido
    notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
    statement_descriptor: 'Criatividade com Amor',
    payment_methods: {
      excluded_payment_methods: [],
      excluded_payment_types: [],
      installments: 12, // Até 12x
    },
    shipments: {
      cost: order.shipping,
      mode: 'not_specified',
    },
  };

  try {
    const response = await mercadopago.preferences.create(preference);
    return response.body;
  } catch (error) {
    console.error('Erro ao criar preferência MP:', error);
    throw error;
  }
}

// ============================================
// BUSCAR DETALHES DO PAGAMENTO
// ============================================
export async function getMercadoPagoPayment(paymentId: string) {
  try {
    const response = await mercadopago.payment.get(paymentId);
    return response.body;
  } catch (error) {
    console.error('Erro ao buscar pagamento MP:', error);
    throw error;
  }
}

// ============================================
// PROCESSAR REEMBOLSO
// ============================================
export async function refundMercadoPagoPayment(paymentId: string, amount?: number) {
  try {
    const refund = await mercadopago.refund.create({
      payment_id: parseInt(paymentId),
      amount, // Opcional - se não passar, reembolsa tudo
    });
    return refund.body;
  } catch (error) {
    console.error('Erro ao processar reembolso MP:', error);
    throw error;
  }
}

// ============================================
// MAPEAR STATUS DO MERCADO PAGO
// ============================================
export function mapMercadoPagoStatus(mpStatus: string): string {
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

// ============================================
// VERIFICAR ASSINATURA DO WEBHOOK (Segurança)
// ============================================
export function verifyMercadoPagoWebhook(
  xSignature: string,
  xRequestId: string,
  dataId: string
): boolean {
  // Implementar verificação de segurança
  // Documentação: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
  
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) return true; // Dev mode

  // Criar hash e comparar com x-signature
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${xRequestId}${dataId}`);
  const hash = hmac.digest('hex');

  return hash === xSignature;
}

// ============================================
// EXEMPLO DE USO
// ============================================

/*
// No seu route de criar pedido:

import { createMercadoPagoPreference } from '../utils/mercadopago';

// Depois de criar o pedido
const order = await prisma.order.create({ ... });

// Criar preferência de pagamento
const preference = await createMercadoPagoPreference(order);

// Salvar no banco
await prisma.payment.create({
  data: {
    orderId: order.id,
    amount: order.total,
    preferenceId: preference.id,
    status: 'PENDING',
  }
});

// Retornar para o frontend
res.json({
  order,
  payment: {
    preferenceId: preference.id,
    initPoint: preference.init_point, // URL para redirecionar
    sandboxInitPoint: preference.sandbox_init_point, // URL de teste
  }
});

// Frontend redireciona para:
window.location.href = payment.initPoint;
// OU abre em modal/iframe

*/

export default {
  createMercadoPagoPreference,
  getMercadoPagoPayment,
  refundMercadoPagoPayment,
  mapMercadoPagoStatus,
  verifyMercadoPagoWebhook,
};
