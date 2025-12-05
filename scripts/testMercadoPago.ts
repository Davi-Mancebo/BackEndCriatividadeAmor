import prisma from '../src/lib/prisma';

async function testMercadoPago() {
  try {
    console.log('🧪 Testando criação de pedido e pagamento...\n');

    // 1. Buscar um produto com imagens
    const product = await prisma.product.findFirst({
      where: { stock: { gt: 0 } },
      include: { images: true }
    });

    if (!product) {
      console.log('❌ Nenhum produto disponível no banco');
      return;
    }

    console.log('✅ Produto encontrado:', product.title);

    // Verificar imagens
    const imageUrl = product.images && product.images.length > 0 
      ? product.images[0]?.url || ''
      : '';

    console.log('📸 Imagem:', imageUrl || 'Sem imagem');

    // 2. Criar pedido
    const order = await prisma.order.create({
      data: {
        customerName: 'Teste MP',
        customerEmail: 'teste@mp.com',
        customerPhone: '11999999999',
        items: [
          {
            productId: product.id,
            title: product.title,
            image: imageUrl,
            quantity: 1,
            price: product.price,
          }
        ],
        subtotal: product.price,
        shipping: 0,
        total: product.price,
        shippingAddress: 'Digital',
        status: 'PENDING',
      }
    });

    console.log('✅ Pedido criado:', order.id);

    // 3. Criar registro de pagamento no banco
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: product.price,
        method: 'CREDIT_CARD',
        status: 'PENDING',
        payerEmail: 'teste@mp.com',
        payerName: 'Teste MP',
      }
    });

    console.log('✅ Pagamento criado:', payment.id);

    // 4. Criar preferência no MP
    const { MercadoPagoService } = await import('../src/services/mercadopago.service');
    const mpService = new MercadoPagoService();

    const preference = await mpService.createPreference({
      orderId: order.id,
      items: [
        {
          id: product.id,
          title: product.title,
          description: product.description || 'Produto digital',
          picture_url: imageUrl || undefined,
          quantity: 1,
          unit_price: product.price,
        }
      ],
      payer: {
        name: 'Teste MP',
        email: 'teste@mp.com',
      },
    });

    console.log('\n✅ Preferência criada com sucesso!');
    console.log('📋 Preference ID:', preference.id);
    console.log('🔗 Link de pagamento:', preference.init_point);
    console.log('🔗 Link sandbox:', preference.sandbox_init_point);
    console.log('\n💳 Use o cartão de teste:');
    console.log('   Número: 5031 4332 1540 6351');
    console.log('   Nome: APRO');
    console.log('   CVV: 123');
    console.log('   Validade: 11/30');
    console.log('\n🌐 Abra o link no navegador e faça o pagamento de teste');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMercadoPago();
