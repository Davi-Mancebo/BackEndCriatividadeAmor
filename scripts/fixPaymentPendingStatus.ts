import prisma from '../src/lib/prisma';

/**
 * Script para corrigir pedidos com status PAYMENT_PENDING
 * Esses pedidos devem ter status PENDING (order.status)
 * e payment.status PENDING para ser interpretado como "pagamento pendente"
 */
async function fixPaymentPendingStatus() {
  try {
    console.log('🔍 Buscando pedidos com status PAYMENT_PENDING...');

    const ordersWithWrongStatus = await prisma.order.findMany({
      where: { status: 'PAYMENT_PENDING' },
      include: { payment: true },
    });

    console.log(`📋 Encontrados ${ordersWithWrongStatus.length} pedidos com status PAYMENT_PENDING`);

    if (ordersWithWrongStatus.length === 0) {
      console.log('✅ Nenhum pedido precisa ser corrigido');
      return;
    }

    for (const order of ordersWithWrongStatus) {
      console.log(`\n🔧 Corrigindo pedido #${order.orderNumber} (${order.id.slice(0, 8)})`);
      console.log(`   Status atual: ${order.status}`);
      console.log(`   Payment status: ${order.payment?.status || 'N/A'}`);

      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'PENDING' },
      });

      console.log(`   ✅ Atualizado para status: PENDING`);
    }

    console.log(`\n✅ Corrigidos ${ordersWithWrongStatus.length} pedidos com sucesso!`);
  } catch (error) {
    console.error('❌ Erro ao corrigir status dos pedidos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixPaymentPendingStatus();
