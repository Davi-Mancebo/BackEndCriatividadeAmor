import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Função para gerar data aleatória entre min e max dias atrás
function randomDateBetweenDays(minDaysAgo: number, maxDaysAgo: number): Date {
  const date = new Date();
  const randomDays = minDaysAgo + Math.floor(Math.random() * (maxDaysAgo - minDaysAgo + 1));
  date.setDate(date.getDate() - randomDays);
  date.setHours(Math.floor(Math.random() * 24));
  date.setMinutes(Math.floor(Math.random() * 60));
  return date;
}

// Status de pedidos e métodos de pagamento
const orderStatuses = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;
const paymentMethods = ['PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'BOLETO'] as const;
const paymentStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;

// Nomes de clientes para gerar dados realistas
const clienteNomes = [
  'Ana Silva', 'João Santos', 'Maria Oliveira', 'Pedro Costa', 'Juliana Lima',
  'Carlos Mendes', 'Fernanda Rocha', 'Roberto Alves', 'Camila Ferreira', 'Lucas Martins',
  'Beatriz Souza', 'Rafael Pereira', 'Patricia Gomes', 'Gustavo Ribeiro', 'Amanda Cardoso'
];

const enderecos = [
  { street: 'Rua das Flores', number: '123', neighborhood: 'Centro', city: 'São Paulo', state: 'SP', zipCode: '01234-567' },
  { street: 'Av. Paulista', number: '1000', neighborhood: 'Bela Vista', city: 'São Paulo', state: 'SP', zipCode: '01310-100' },
  { street: 'Rua Oscar Freire', number: '500', neighborhood: 'Jardins', city: 'São Paulo', state: 'SP', zipCode: '01426-000' },
  { street: 'Av. Copacabana', number: '800', neighborhood: 'Copacabana', city: 'Rio de Janeiro', state: 'RJ', zipCode: '22070-000' },
  { street: 'Rua da Praia', number: '200', neighborhood: 'Centro', city: 'Porto Alegre', state: 'RS', zipCode: '90010-000' },
];

async function main() {
  console.log('🌱 Seed 3 meses - Iniciando...\n');

  // 1. Criar/buscar admin
  let admin = await prisma.user.findFirst();
  if (!admin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    admin = await prisma.user.create({
      data: {
        name: 'Admin Principal',
        email: 'admin@criatividade.com',
        password: hashedPassword,
        role: 'ADMIN',
        phone: '11999999999',
      }
    });
    console.log('✅ Admin criado');
  } else {
    console.log('✅ Admin já existe');
  }

  // 2. Buscar produtos específicos (os 3 que existem no frontend)
  const produtoTitulos = ['teste345', 'teste3', '312312312'];
  const produtos = [];
  
  for (const titulo of produtoTitulos) {
    const produto = await prisma.product.findFirst({
      where: { title: titulo },
      include: { images: true },
    });
    if (produto) {
      produtos.push(produto);
    }
  }

  if (produtos.length < 3) {
    console.error(`❌ Erro: Encontrados apenas ${produtos.length} produtos. Criando produtos faltantes...`);
    
    // Criar produtos se não existirem
    for (const titulo of produtoTitulos) {
      const existe = produtos.find(p => p.title === titulo);
      if (!existe) {
        const novoProduto = await prisma.product.create({
          data: {
            title: titulo,
            description: `Produto ${titulo}`,
            price: titulo === 'teste345' ? 11.00 : titulo === 'teste3' ? 19.00 : 55.00,
            stock: 100,
            active: true,
            featured: true,
          }
        });
        produtos.push(novoProduto);
      }
    }
  }

  console.log(`✅ ${produtos.length} produtos encontrados/criados para usar no seed`);

  // 3. Criar 10 clientes cadastrados
  const clientes = [];
  console.log('👥 Criando clientes...');
  
  for (let i = 0; i < 10; i++) {
    const hashedPassword = await bcrypt.hash('senha123', 10);
    const cliente = await prisma.customer.upsert({
      where: { email: `cliente${i + 1}@email.com` },
      update: {},
      create: {
        name: clienteNomes[i] || `Cliente ${i + 1}`,
        email: `cliente${i + 1}@email.com`,
        password: hashedPassword,
        phone: `119999${String(i).padStart(5, '0')}`,
        age: 20 + Math.floor(Math.random() * 40),
      }
    });
    clientes.push(cliente);
  }
  console.log(`✅ ${clientes.length} clientes criados`);

  // 4. Criar pedidos dos últimos 90 dias (3 meses)
  console.log('📦 Criando pedidos dos últimos 3 meses...');
  // mes 0 = setembro (60-90 dias atrás), mes 1 = outubro (30-60 dias), mes 2 = novembro (0-30 dias)
  const pedidosPorMes = [60, 25, 3]; // Setembro: 60 (100%), Outubro: 25 (~70%), Novembro: 3 (~6%)
  let totalPedidos = 0;
  let totalPagamentos = 0;
  let totalHistoricos = 0;

  for (let mes = 0; mes < 3; mes++) {
    const diasBase = (2 - mes) * 30; // mes 0 = 60-90 (set), mes 1 = 30-60 (out), mes 2 = 0-30 (nov)
    const numPedidos = pedidosPorMes[mes];

    for (let p = 0; p < numPedidos; p++) {
      // 70% de clientes cadastrados, 30% guests
      const isCliente = Math.random() > 0.3;
      let customerId = null;
      let customerName = '';
      let customerEmail = '';
      let customerPhone = '';

      if (isCliente) {
        const cliente = clientes[Math.floor(Math.random() * clientes.length)];
        customerId = cliente.id;
        customerName = cliente.name;
        customerEmail = cliente.email;
        customerPhone = cliente.phone || '';
      } else {
        customerName = clienteNomes[Math.floor(Math.random() * clienteNomes.length)];
        customerEmail = `guest${Date.now()}${Math.random()}@email.com`;
        customerPhone = `11999${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
      }

      // Selecionar 1-3 produtos aleatórios
      const numItens = Math.floor(Math.random() * 3) + 1;
      const produtosSelecionados = [];
      for (let i = 0; i < numItens; i++) {
        produtosSelecionados.push(produtos[Math.floor(Math.random() * produtos.length)]);
      }

      const items = produtosSelecionados.map(prod => ({
        productId: prod.id,
        title: prod.title,
        price: prod.price,
        quantity: Math.floor(Math.random() * 3) + 1,
      }));

      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const shipping = Math.random() > 0.2 ? 15 : 0; // 80% com frete
      const total = subtotal + shipping;

      // Setembro (mes 0): 85% entregues, 15% outros status
      // Outubro/Novembro: distribuição normal
      const statusEntregues = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;
      const status = (mes === 0 && Math.random() > 0.15 
        ? statusEntregues[Math.floor(Math.random() * statusEntregues.length)]
        : orderStatuses[Math.floor(Math.random() * orderStatuses.length)]) as typeof orderStatuses[number];
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const endereco = enderecos[Math.floor(Math.random() * enderecos.length)];

      // Criar data dentro do range correto do mês
      const minDias = diasBase;
      const maxDias = diasBase + 29;
      const createdAt = randomDateBetweenDays(minDias, maxDias);

      const order = await prisma.order.create({
        data: {
          customerId,
          customerName,
          customerEmail,
          customerPhone,
          items,
          subtotal,
          shipping,
          total,
          status,
          paymentMethod,
          shippingAddress: endereco,
          trackingCode: status !== 'PENDING' && status !== 'CANCELLED' ? `BR${Math.random().toString().slice(2, 13)}SP` : undefined,
          createdAt,
          updatedAt: createdAt,
        }
      });
      totalPedidos++;

      // Criar pagamento
      const paymentStatus = status === 'PAID' || status === 'PROCESSING' || status === 'SHIPPED' || status === 'DELIVERED' 
        ? 'APPROVED' 
        : status === 'CANCELLED' 
        ? 'CANCELLED' 
        : 'PENDING';

      await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: total,
          method: paymentMethod,
          status: paymentStatus,
          payerEmail: customerEmail,
          payerName: customerName,
          approvedAt: paymentStatus === 'APPROVED' ? createdAt : undefined,
          createdAt,
          updatedAt: createdAt,
        }
      });
      totalPagamentos++;

      // Criar histórico de compras se pedido foi pago/entregue
      if (['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(status)) {
        for (const item of items) {
          await prisma.purchaseHistory.create({
            data: {
              orderId: order.id,
              customerEmail,
              customerName,
              productId: item.productId,
              productTitle: item.title,
              pricePaid: item.price * item.quantity,
              purchasedAt: createdAt,
            }
          });
          totalHistoricos++;
        }
      }
    }
  }

  console.log(`✅ ${totalPedidos} pedidos criados`);
  console.log(`✅ ${totalPagamentos} pagamentos criados`);
  console.log(`✅ ${totalHistoricos} históricos de compra criados`);

  // 5. Criar reviews (apenas clientes que compraram)
  console.log('⭐ Criando reviews...');
  let totalReviews = 0;

  for (const cliente of clientes) {
    // Verificar se o cliente comprou algum produto
    const compras = await prisma.purchaseHistory.findMany({
      where: { customerEmail: cliente.email },
      distinct: ['productId'],
    });

    // Cliente faz review de 50% dos produtos que comprou
    for (const compra of compras) {
      if (Math.random() > 0.5) {
        await prisma.review.create({
          data: {
            productId: compra.productId,
            customerId: cliente.id,
            customerName: cliente.name,
            customerEmail: cliente.email,
            rating: Math.floor(Math.random() * 2) + 4, // 4-5 estrelas
            comment: `Produto excelente! Muito satisfeito com a compra. Recomendo!`,
            verified: true,
          }
        });
        totalReviews++;
      }
    }
  }

  console.log(`✅ ${totalReviews} reviews criadas`);

  // 6. Criar notificações (últimos 10 pedidos)
  console.log('🔔 Criando notificações...');
  const ultimosPedidos = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  let totalNotificacoes = 0;
  for (const pedido of ultimosPedidos) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        type: 'NEW_ORDER',
        title: `Novo pedido #${pedido.orderNumber}`,
        message: `Pedido de ${pedido.customerName} - R$ ${pedido.total.toFixed(2)}`,
        read: Math.random() > 0.7, // 30% lidas
        data: { orderId: pedido.id },
        createdAt: pedido.createdAt,
      }
    });
    totalNotificacoes++;
  }

  console.log(`✅ ${totalNotificacoes} notificações criadas`);

  // 7. Criar metas de vendas para os últimos 3 meses
  console.log('🎯 Criando metas de vendas...');
  const hoje = new Date();
  const metas = [];

  // Criar metas para setembro, outubro e novembro de 2025
  const metasConfig = [
    { month: 9, year: 2025, value: 5000, desc: 'setembro' },   // Setembro: 50 pedidos = 100%
    { month: 10, year: 2025, value: 3500, desc: 'outubro' },   // Outubro: 25 pedidos = ~70%
    { month: 11, year: 2025, value: 5000, desc: 'novembro' },  // Novembro: 3 pedidos = ~6%
  ];

  for (const config of metasConfig) {
    await prisma.salesGoal.upsert({
      where: { month_year: { month: config.month, year: config.year } },
      update: {},
      create: {
        month: config.month,
        year: config.year,
        targetValue: config.value,
        description: `Meta ${config.desc} ${config.year}`,
      }
    });
    metas.push(`${config.month}/${config.year}`);
  }

  console.log(`✅ ${metas.length} metas criadas: ${metas.join(', ')}`);

  // 8. Criar promoções para os produtos
  console.log('🎉 Criando promoções...');
  let totalPromocoes = 0;

  for (let i = 0; i < Math.min(2, produtos.length); i++) {
    await prisma.promotion.create({
      data: {
        productId: produtos[i].id,
        name: `Promoção ${produtos[i].title}`,
        discountPercent: 10 + (i * 5),
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
        active: true,
      }
    });
    totalPromocoes++;
  }

  console.log(`✅ ${totalPromocoes} promoções criadas`);

  console.log('\n🎉 Seed completo! Banco pronto para testar o painel admin com 3 meses de dados.');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
