import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Cria um novo admin com senha criptografada
  let admin = await prisma.user.findUnique({ where: { email: 'admin2@teste.com' } });
  if (!admin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    admin = await prisma.user.create({
      data: {
        name: 'Admin Extra',
        email: 'admin2@teste.com',
        password: hashedPassword,
        role: 'ADMIN',
        avatar: null,
        phone: '11999999999',
      }
    });
  }

  // Cria 5 clientes com senhas criptografadas
  const clientes = [];
  let clientesCriados = 0;
  for (let i = 1; i <= 5; i++) {
    let cliente = await prisma.customer.findUnique({ where: { email: `cliente${i}@teste.com` } });
    if (!cliente) {
      const hashedPassword = await bcrypt.hash(`senha${i}`, 10);
      cliente = await prisma.customer.create({
        data: {
          name: `Cliente ${i}`,
          email: `cliente${i}@teste.com`,
          password: hashedPassword,
          phone: `1199999999${i}`,
          age: 20 + i,
          avatar: null,
        }
      });
      clientesCriados++;
    }
    clientes.push(cliente);
  }

  // Busca produtos existentes
  const produtos = await prisma.product.findMany({ take: 5 });
  if (produtos.length === 0) {
    throw new Error('Nenhum produto encontrado. Adicione produtos antes de rodar o seed.');
  }

  // Para cada cliente, cria 2 pedidos, cada pedido com 2 produtos
  let pedidosCriados = 0, pagamentosCriados = 0, historicosCriados = 0, notificacoesCriadas = 0, reviewsCriadas = 0;
  for (const cliente of clientes) {
    for (let p = 1; p <= 2; p++) {
      const items = produtos.slice(0, 2).map((prod: any) => ({
        productId: prod.id,
        title: prod.title,
        price: prod.price,
        quantity: 1 + p
      }));
      const subtotal = items.reduce((acc: number, item: any) => acc + item.price * item.quantity, 0);
      const shipping = 15.0;
      const total = subtotal + shipping;
      const order = await prisma.order.create({
        data: {
          customerId: cliente.id,
          customerName: cliente.name,
          customerEmail: cliente.email,
          customerPhone: cliente.phone,
          items,
          subtotal,
          shipping,
          total,
          status: 'PAID',
          paymentMethod: 'PIX',
          notes: `Pedido de teste ${p}`,
          shippingAddress: {
            street: 'Rua Teste',
            number: '123',
            complement: '',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01000-000'
          },
        }
      });
      pedidosCriados++;

      // Pagamento
      await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: total,
          method: 'PIX',
          status: 'APPROVED',
          payerEmail: cliente.email,
          payerName: cliente.name,
        }
      });
      pagamentosCriados++;

      // Histórico de compra
      for (const item of items) {
        await prisma.purchaseHistory.create({
          data: {
            orderId: order.id,
            customerEmail: cliente.email,
            customerName: cliente.name,
            productId: item.productId,
            productTitle: item.title,
            pricePaid: item.price * item.quantity,
          }
        });
        historicosCriados++;
      }

      // Notificação para o admin
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'NEW_ORDER',
          title: `Novo pedido de ${cliente.name}`,
          message: `Pedido ${order.orderNumber} criado.`,
          read: false,
          data: { orderId: order.id, customerId: cliente.id }
        }
      });
      notificacoesCriadas++;
    }
    // Review para o primeiro produto
    await prisma.review.create({
      data: {
        productId: produtos[0].id,
        customerId: cliente.id,
        customerName: cliente.name,
        customerEmail: cliente.email,
        rating: 4,
        comment: `Ótimo produto! Cliente ${cliente.name}`,
        verified: true,
      }
    });
    reviewsCriadas++;
  }

  // Meta de vendas
  await prisma.salesGoal.upsert({
    where: { month_year: { month: 12, year: 2025 } },
    update: { targetValue: 10000, description: 'Meta de dezembro' },
    create: { month: 12, year: 2025, targetValue: 10000, description: 'Meta de dezembro' }
  });

  // Meta especial para outubro: pelo menos 130% acima do total de pedidos
  const pedidosOutubro = await prisma.order.count({
    where: {
      createdAt: {
        gte: new Date('2025-10-01T00:00:00.000Z'),
        lt: new Date('2025-11-01T00:00:00.000Z'),
      }
    }
  });
  const metaOutubro = Math.ceil(pedidosOutubro * 2.3) || 15;
  await prisma.salesGoal.upsert({
    where: { month_year: { month: 10, year: 2025 } },
    update: { targetValue: metaOutubro, description: 'Meta outubro 130% acima dos pedidos' },
    create: { month: 10, year: 2025, targetValue: metaOutubro, description: 'Meta outubro 130% acima dos pedidos' }
  });

  // Promoção para o primeiro produto
  await prisma.promotion.create({
    data: {
      productId: produtos[0].id,
      name: 'Promoção Teste',
      discountPercent: 10,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      active: true,
    }
  });

  // Arquivo digital para o primeiro produto
  await prisma.digitalFile.create({
    data: {
      productId: produtos[0].id,
      name: 'Arquivo Teste.pdf',
      description: 'Arquivo de exemplo',
      fileUrl: 'https://exemplo.com/arquivo.pdf',
      fileSize: 1024,
      fileType: 'application/pdf',
      active: true,
    }
  });

  console.log(`Banco populado!\nClientes: ${clientesCriados}\nPedidos: ${pedidosCriados}\nPagamentos: ${pagamentosCriados}\nHistóricos: ${historicosCriados}\nNotificações: ${notificacoesCriadas}\nReviews: ${reviewsCriadas}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
