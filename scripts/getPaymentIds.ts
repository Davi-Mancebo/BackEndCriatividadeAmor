import prisma from '../src/lib/prisma';

async function getPaymentIds() {
  try {
    const payments = await prisma.payment.findMany({
      where: { 
        mercadoPagoId: { not: null } 
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    });

    if (payments.length === 0) {
      console.log('❌ Nenhum Payment ID encontrado no banco de dados');
      console.log('\n💡 Para obter um Payment ID:');
      console.log('1. Faça um pagamento real de R$ 0,01 pelo seu sistema');
      console.log('2. Ou acesse: https://www.mercadopago.com.br/activities');
      console.log('3. Copie um Payment ID de pagamentos anteriores');
    } else {
      console.log('✅ Payment IDs encontrados:\n');
      payments.forEach((p, i) => {
        console.log(`${i + 1}. ${p.mercadoPagoId}`);
        console.log(`   Pedido: ${p.orderId}`);
        console.log(`   Status: ${p.status}`);
        console.log(`   Data: ${p.createdAt}\n`);
      });
      
      console.log('\n💡 Use qualquer um desses IDs no modal do Mercado Pago');
    }
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getPaymentIds();
