import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Tipos dos enums
type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_SLIP';
type NotificationType = 'ORDER' | 'PAYMENT' | 'DELIVERY' | 'PROMOTION' | 'SYSTEM';

// Função para gerar data aleatória nos últimos 30 dias
function randomDateInLast30Days(daysAgo: number = 30): Date {
  const date = new Date();
  const randomDays = Math.floor(Math.random() * daysAgo);
  date.setDate(date.getDate() - randomDays);
  date.setHours(Math.floor(Math.random() * 24));
  date.setMinutes(Math.floor(Math.random() * 60));
  return date;
}

// Lista de clientes simulados
const customers = [
  { name: 'Maria Silva', email: 'maria.silva@email.com', phone: '(11) 98888-7777' },
  { name: 'João Santos', email: 'joao.santos@email.com', phone: '(21) 97777-6666' },
  { name: 'Ana Costa', email: 'ana.costa@email.com', phone: '(31) 96666-5555' },
  { name: 'Pedro Oliveira', email: 'pedro.oliveira@email.com', phone: '(41) 95555-4444' },
  { name: 'Juliana Lima', email: 'juliana.lima@email.com', phone: '(51) 94444-3333' },
  { name: 'Carlos Mendes', email: 'carlos.mendes@email.com', phone: '(61) 93333-2222' },
  { name: 'Fernanda Rocha', email: 'fernanda.rocha@email.com', phone: '(71) 92222-1111' },
  { name: 'Roberto Alves', email: 'roberto.alves@email.com', phone: '(81) 91111-0000' },
  { name: 'Camila Ferreira', email: 'camila.ferreira@email.com', phone: '(85) 90000-9999' },
  { name: 'Lucas Martins', email: 'lucas.martins@email.com', phone: '(11) 99999-8888' },
];

// Endereços simulados
const addresses = [
  { street: 'Rua das Flores', number: '123', neighborhood: 'Centro', city: 'São Paulo', state: 'SP', zipCode: '01234-567' },
  { street: 'Av. Paulista', number: '1000', neighborhood: 'Bela Vista', city: 'São Paulo', state: 'SP', zipCode: '01310-100' },
  { street: 'Rua Oscar Freire', number: '500', neighborhood: 'Jardins', city: 'São Paulo', state: 'SP', zipCode: '01426-000' },
  { street: 'Av. Copacabana', number: '800', neighborhood: 'Copacabana', city: 'Rio de Janeiro', state: 'RJ', zipCode: '22070-000' },
  { street: 'Rua da Praia', number: '200', neighborhood: 'Centro', city: 'Porto Alegre', state: 'RS', zipCode: '90010-000' },
  { street: 'Av. Afonso Pena', number: '1500', neighborhood: 'Centro', city: 'Belo Horizonte', state: 'MG', zipCode: '30130-000' },
];

const orderStatuses: OrderStatus[] = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const paymentMethods: PaymentMethod[] = ['CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'BANK_SLIP'];

async function main() {
  console.log('🌱 Iniciando seed completo - Simulando 30 dias de operação...\n');

  // Limpar dados existentes
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.purchaseHistory.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  console.log('🗑️  Banco de dados limpo');

  // Criar usuário admin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Administrador',
      email: 'admin@criatividade.com',
      password: hashedPassword,
      role: 'ADMIN',
      phone: '(11) 99999-9999',
    },
  });
  console.log('✅ Usuário admin criado:', admin.email);

  // Criar alguns clientes cadastrados
  const registeredCustomers = await Promise.all([
    prisma.customer.create({
      data: {
        name: 'Maria Silva Santos',
        email: 'maria.silva.santos@email.com',
        password: await bcrypt.hash('senha123', 10),
        phone: '(11) 98888-7777',
        age: 32,
      },
    }),
    prisma.customer.create({
      data: {
        name: 'João Pedro Costa',
        email: 'joao.pedro.costa@email.com',
        password: await bcrypt.hash('senha123', 10),
        phone: '(21) 97777-6666',
        age: 28,
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Ana Carolina Lima',
        email: 'ana.carolina.lima@email.com',
        password: await bcrypt.hash('senha123', 10),
        phone: '(31) 96666-5555',
        age: 35,
      },
    }),
  ]);
  console.log(`✅ ${registeredCustomers.length} clientes cadastrados`);

  // Criar produtos diversos
  const products = await Promise.all([
    // Jogos físicos
    prisma.product.create({
      data: {
        title: 'Jogo da Velha Magnético Premium',
        description: 'Jogo da velha premium com ímãs, ideal para viagens e diversão em família. Material de alta qualidade.',
        price: 89.90,
        comparePrice: 129.90,
        stock: 45,
        sales: 15,
        category: 'Jogos de Tabuleiro',
        tags: ['jogo', 'magnético', 'viagem', 'família', 'premium'],
        type: 'PHYSICAL',
        condition: 'NEW',
        featured: true,
        sku: 'JV-MAG-001',
        weight: 300,
        dimensions: { width: 20, height: 20, depth: 3 },
        createdAt: randomDateInLast30Days(30),
      },
    }),
    prisma.product.create({
      data: {
        title: 'Quebra-Cabeça Educativo 500 Peças - Sistema Solar',
        description: 'Quebra-cabeça educativo sobre o sistema solar. Perfeito para aprender brincando!',
        price: 129.90,
        comparePrice: 189.90,
        stock: 28,
        sales: 12,
        category: 'Educativos',
        tags: ['quebra-cabeça', 'educativo', 'espaço', 'ciência', 'infantil'],
        type: 'PHYSICAL',
        condition: 'NEW',
        featured: true,
        sku: 'QC-EDU-500',
        weight: 600,
        dimensions: { width: 30, height: 40, depth: 5 },
        createdAt: randomDateInLast30Days(28),
      },
    }),
    prisma.product.create({
      data: {
        title: 'Dominó Gigante Educativo',
        description: 'Dominó com peças grandes e coloridas, ideal para crianças de 3 a 8 anos.',
        price: 69.90,
        comparePrice: 99.90,
        stock: 60,
        sales: 20,
        category: 'Jogos de Tabuleiro',
        tags: ['dominó', 'educativo', 'infantil', 'colorido', 'grande'],
        type: 'PHYSICAL',
        condition: 'NEW',
        featured: true,
        sku: 'DOM-GIG-001',
        weight: 800,
        dimensions: { width: 25, height: 25, depth: 8 },
        createdAt: randomDateInLast30Days(25),
      },
    }),
    prisma.product.create({
      data: {
        title: 'Memória Ilustrada - Animais',
        description: 'Jogo de memória com 40 cartas ilustradas com animais. Estimula cognição e memória.',
        price: 45.90,
        stock: 80,
        sales: 25,
        category: 'Jogos de Memória',
        tags: ['memória', 'animais', 'educativo', 'cognitivo', 'cartas'],
        type: 'PHYSICAL',
        condition: 'NEW',
        featured: false,
        sku: 'MEM-ANI-001',
        weight: 200,
        dimensions: { width: 15, height: 15, depth: 4 },
        createdAt: randomDateInLast30Days(22),
      },
    }),
    prisma.product.create({
      data: {
        title: 'Xadrez de Madeira Profissional',
        description: 'Tabuleiro e peças de madeira nobre. Jogo completo para iniciantes e experientes.',
        price: 159.90,
        comparePrice: 249.90,
        stock: 35,
        sales: 8,
        category: 'Jogos de Tabuleiro',
        tags: ['xadrez', 'madeira', 'profissional', 'estratégia', 'premium'],
        type: 'PHYSICAL',
        condition: 'NEW',
        featured: true,
        sku: 'XAD-MAD-001',
        weight: 1200,
        dimensions: { width: 40, height: 40, depth: 5 },
        createdAt: randomDateInLast30Days(20),
      },
    }),
    // Produtos digitais
    prisma.product.create({
      data: {
        title: 'Kit Digital - Jogo da Velha para Imprimir',
        description: 'PDF com 10 designs diferentes de jogo da velha para imprimir. Inclui instruções e dicas.',
        price: 19.90,
        stock: 999,
        sales: 45,
        category: 'Digitais',
        tags: ['digital', 'pdf', 'jogo', 'imprimir', 'kit'],
        type: 'DIGITAL',
        condition: 'NEW',
        featured: false,
        sku: 'JV-PDF-001',
        createdAt: randomDateInLast30Days(18),
      },
    }),
    prisma.product.create({
      data: {
        title: 'Ebook - 50 Jogos Educativos para Crianças',
        description: 'Ebook digital com 50 jogos educativos para imprimir e jogar em família.',
        price: 29.90,
        stock: 999,
        sales: 38,
        category: 'Digitais',
        tags: ['ebook', 'digital', 'educativo', 'jogos', 'família'],
        type: 'DIGITAL',
        condition: 'NEW',
        featured: true,
        sku: 'EB-JOG-050',
        createdAt: randomDateInLast30Days(15),
      },
    }),
    prisma.product.create({
      data: {
        title: 'Caça-Palavras Temático - 100 Páginas PDF',
        description: 'Coletânea com 100 caça-palavras temáticos em PDF. Diversos níveis de dificuldade.',
        price: 24.90,
        stock: 999,
        sales: 30,
        category: 'Digitais',
        tags: ['caça-palavras', 'pdf', 'digital', 'passatempo', 'educativo'],
        type: 'DIGITAL',
        condition: 'NEW',
        featured: false,
        sku: 'CP-PDF-100',
        createdAt: randomDateInLast30Days(12),
      },
    }),
  ]);
  console.log('✅ 8 produtos criados com sucesso');

  // Criar pedidos simulando 30 dias de operação
  const orders = [];
  const notifications = [];
  
  console.log('📦 Criando pedidos dos últimos 30 dias...');

  // Criar 50 pedidos aleatórios (30 de clientes cadastrados + 20 de guests)
  for (let i = 0; i < 50; i++) {
    const isRegisteredCustomer = i < 30; // Primeiros 30 pedidos são de clientes cadastrados
    
    let customerData;
    let customerId = null;
    
    if (isRegisteredCustomer && registeredCustomers.length > 0) {
      // Cliente cadastrado
      const registeredCustomer = registeredCustomers[Math.floor(Math.random() * registeredCustomers.length)];
      customerData = {
        name: registeredCustomer.name,
        email: registeredCustomer.email,
        phone: registeredCustomer.phone,
      };
      customerId = registeredCustomer.id;
    } else {
      // Cliente guest (não cadastrado)
      const guestCustomer = customers[Math.floor(Math.random() * customers.length)];
      customerData = guestCustomer;
    }
    
    const address = addresses[Math.floor(Math.random() * addresses.length)];
    const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    
    // Selecionar 1-3 produtos aleatórios
    const numItems = Math.floor(Math.random() * 3) + 1;
    const selectedProducts = [];
    const usedIndices = new Set();
    
    while (selectedProducts.length < numItems) {
      const randomIndex = Math.floor(Math.random() * products.length);
      if (!usedIndices.has(randomIndex)) {
        usedIndices.add(randomIndex);
        selectedProducts.push(products[randomIndex]);
      }
    }
    
    const items = selectedProducts.map(product => ({
      productId: product.id,
      title: product.title,
      quantity: Math.floor(Math.random() * 2) + 1,
      price: product.price,
    }));
    
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = Math.random() > 0.3 ? 15 : 0; // 70% com frete
    const total = subtotal + shipping;
    const createdDate = randomDateInLast30Days(30);
    
    const order = await prisma.order.create({
      data: {
        customerId, // Pode ser null para guests
        customerName: customerData.name,
        customerEmail: customerData.email,
        customerPhone: customerData.phone,
        subtotal,
        shipping,
        total,
        status,
        paymentMethod,
        shippingAddress: {
          ...address,
          complement: Math.random() > 0.5 ? `Apto ${Math.floor(Math.random() * 100) + 1}` : undefined,
        },
        items,
        trackingCode: status !== 'PENDING' && status !== 'CANCELLED' ? `BR${Math.random().toString().slice(2, 13)}SP` : undefined,
        notes: Math.random() > 0.7 ? 'Cliente solicitou entrega no período da tarde' : undefined,
        createdAt: createdDate,
        updatedAt: createdDate,
      },
    });
    
    orders.push(order);
  }
  
  console.log(`✅ ${orders.length} pedidos criados`);

  // Criar notificações - últimos 3 pedidos NÃO LIDOS
  console.log('🔔 Criando notificações...');
  
  // Ordenar pedidos por data (mais recente primeiro)
  const sortedOrders = [...orders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  
  // Últimos 3 pedidos - notificações NÃO LIDAS
  for (let i = 0; i < 3; i++) {
    const order = sortedOrders[i];
    const notification = await prisma.notification.create({
      data: {
        userId: admin.id,
        type: 'NEW_ORDER',
        title: 'Novo pedido recebido!',
        message: `Pedido #${order.id.substring(0, 8)} de ${order.customerName} - R$ ${order.total.toFixed(2)}`,
        read: false, // NÃO LIDO
        data: {
          orderId: order.id,
          customerName: order.customerName,
          total: order.total,
        },
        createdAt: order.createdAt,
      },
    });
    notifications.push(notification);
  }
  
  // Pedidos mais antigos - notificações já LIDAS
  for (let i = 3; i < Math.min(10, sortedOrders.length); i++) {
    const order = sortedOrders[i];
    const notification = await prisma.notification.create({
      data: {
        userId: admin.id,
        type: 'NEW_ORDER',
        title: 'Pedido recebido',
        message: `Pedido #${order.id.substring(0, 8)} de ${order.customerName} - R$ ${order.total.toFixed(2)}`,
        read: true, // JÁ LIDO
        data: {
          orderId: order.id,
          customerName: order.customerName,
          total: order.total,
        },
        createdAt: order.createdAt,
      },
    });
    notifications.push(notification);
  }
  
  // Notificações de status de pedido (algumas lidas, outras não)
  const deliveredOrders = orders.filter(o => o.status === 'DELIVERED').slice(0, 5);
  for (const order of deliveredOrders) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        type: 'SYSTEM',
        title: 'Pedido entregue',
        message: `Pedido #${order.id.substring(0, 8)} foi entregue com sucesso!`,
        read: true,
        data: {
          orderId: order.id,
        },
        createdAt: new Date(order.createdAt.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 dias depois
      },
    });
  }
  
  console.log(`✅ ${notifications.length + deliveredOrders.length} notificações criadas`);
  console.log(`   📌 3 notificações NÃO LIDAS (últimos pedidos)`);
  console.log(`   ✔️  ${notifications.length - 3 + deliveredOrders.length} notificações já lidas`);

  // Criar algumas promoções
  await prisma.promotion.create({
    data: {
      name: 'Black Friday - Jogo da Velha',
      discountPercent: 30,
      productId: products[0].id,
      startDate: new Date('2025-11-25'),
      endDate: new Date('2025-12-05'),
      active: true,
      createdAt: randomDateInLast30Days(10),
    },
  });
  
  await prisma.promotion.create({
    data: {
      name: 'Combo Educativo - R$40 OFF',
      discountAmount: 40,
      productId: products[1].id,
      startDate: new Date('2025-11-20'),
      endDate: new Date('2025-12-10'),
      active: true,
      createdAt: randomDateInLast30Days(12),
    },
  });
  
  console.log('✅ 2 promoções criadas');

  // Estatísticas finais
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const pendingOrders = orders.filter(o => o.status === 'PENDING').length;
  const deliveredOrders2 = orders.filter(o => o.status === 'DELIVERED').length;
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 SEED COMPLETO - SIMULAÇÃO DE 30 DIAS');
  console.log('='.repeat(60));
  console.log(`📦 Total de pedidos: ${totalOrders}`);
  console.log(`💰 Receita total: R$ ${totalRevenue.toFixed(2)}`);
  console.log(`⏳ Pedidos pendentes: ${pendingOrders}`);
  console.log(`✅ Pedidos entregues: ${deliveredOrders2}`);
  console.log(`📦 Produtos cadastrados: ${products.length}`);
  console.log(`🔔 Notificações não lidas: 3`);
  console.log(`🎁 Promoções ativas: 2`);
  console.log('='.repeat(60));
  console.log('\n📧 Login Admin: admin@criatividade.com');
  console.log('🔑 Senha: admin123');
  console.log('\n✨ Sistema pronto para testes!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
