import { PrismaClient, PaymentMethod, PaymentStatus, OrderStatus, ProductType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_CREDENTIALS = {
  name: 'Admin Master',
  email: 'admin@criatividadeamor.com',
  password: 'Admin#2025',
};

const CUSTOMER_FIXTURES = [
  { name: 'Luna Costa', email: 'luna.cliente@teste.com', phone: '11999880011', password: 'Cliente#2025' },
  { name: 'Diego Araujo', email: 'diego.cliente@teste.com', phone: '21988776655', password: 'Cliente#2025' },
  { name: 'Soraia Luz', email: 'soraia.cliente@teste.com', phone: '31977665544', password: 'Cliente#2025' },
];

const PRODUCT_FIXTURES = [
  {
    title: 'Planner Criatividade Amor 2026',
    description: 'Planner digital semanal com atividades lúdicas para imprimir e usar com a turma.',
    price: 37.0,
    category: 'Planejamento',
    tags: ['planner', 'educacional', 'imprimir'],
    placeholder: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=80',
  },
  {
    title: 'Kit Datas Comemorativas',
    description: 'Pacote de artes e atividades para todas as datas comemorativas do semestre.',
    price: 52.0,
    category: 'Datas Especiais',
    tags: ['datas', 'kit', 'artes'],
    placeholder: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1000&q=80',
  },
  {
    title: 'Apostila Jogos Cooperativos',
    description: 'Jogos cooperativos para estimular trabalho em equipe em salas de aula ou eventos.',
    price: 29.9,
    category: 'Jogos',
    tags: ['jogos', 'cooperativo'],
    placeholder: 'https://images.unsplash.com/photo-1505778276668-26b3ff7af103?auto=format&fit=crop&w=1000&q=80',
  },
  {
    title: 'Calendário Interativo 2026',
    description: 'Calendário interativo e editável pronto para personalizar.',
    price: 18.9,
    category: 'Calendários',
    tags: ['calendario', 'interativo'],
    placeholder: 'https://images.unsplash.com/photo-1494172961521-33799ddd43a5?auto=format&fit=crop&w=1000&q=80',
  },
  {
    title: 'Workshop Gravado: Brincadeiras Sensoriais',
    description: 'Workshop completo com plano de aula e materiais de apoio.',
    price: 67.0,
    category: 'Workshops',
    tags: ['workshop', 'sensorial'],
    placeholder: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1000&q=80',
  },
];

const SHIPPING_ADDRESSES = [
  { street: 'Rua das Acácias', number: '45', neighborhood: 'Centro', city: 'São Paulo', state: 'SP', zipCode: '01010-010' },
  { street: 'Av. Atlântica', number: '1500', neighborhood: 'Copacabana', city: 'Rio de Janeiro', state: 'RJ', zipCode: '22021-001' },
  { street: 'Rua da Aurora', number: '200', neighborhood: 'Boa Vista', city: 'Recife', state: 'PE', zipCode: '50050-000' },
  { street: 'Rua XV de Novembro', number: '999', neighborhood: 'Centro', city: 'Curitiba', state: 'PR', zipCode: '80020-310' },
];

const SUCCESS_STATUSES: OrderStatus[] = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
const PAYMENT_SUCCESS: PaymentStatus[] = ['APPROVED'];
const PAYMENT_PENDING: PaymentStatus[] = ['PENDING'];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(randomInt(8, 20), randomInt(0, 59), randomInt(0, 59), 0);
  return date;
}

function buildItems(products: { id: string; title: string; price: number }[]) {
  const count = randomInt(1, Math.min(3, products.length));
  const picked = Array.from({ length: count }).map(() => randomChoice(products));
  const items = picked.map((product) => ({
    productId: product.id,
    title: product.title,
    price: product.price,
    quantity: randomInt(1, 3),
  }));
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  return { items, subtotal };
}

async function resetDatabase() {
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.purchaseHistory.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.order.deleteMany(),
    prisma.review.deleteMany(),
    prisma.digitalFile.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.promotion.deleteMany(),
    prisma.salesGoal.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.user.deleteMany(),
    prisma.product.deleteMany(),
  ]);
}

async function createAdmin() {
  const hashed = await bcrypt.hash(ADMIN_CREDENTIALS.password, 12);
  return prisma.user.create({
    data: {
      name: ADMIN_CREDENTIALS.name,
      email: ADMIN_CREDENTIALS.email,
      password: hashed,
      role: 'ADMIN',
      phone: '11999999999',
    },
  });
}

async function createCustomers() {
  const results = [];
  for (const customer of CUSTOMER_FIXTURES) {
    const hashed = await bcrypt.hash(customer.password, 12);
    const record = await prisma.customer.create({
      data: {
        name: customer.name,
        email: customer.email,
        password: hashed,
        phone: customer.phone,
        age: randomInt(24, 42),
      },
    });
    results.push(record);
  }
  return results;
}

async function createProducts() {
  const records = [];
  for (const product of PRODUCT_FIXTURES) {
    const record = await prisma.product.create({
      data: {
        title: product.title,
        description: product.description,
        price: product.price,
        stock: 150,
        category: product.category,
        tags: product.tags,
        type: ProductType.DIGITAL,
        condition: 'NEW',
        active: true,
        featured: true,
      },
    });

    await prisma.productImage.create({
      data: {
        productId: record.id,
        url: product.placeholder,
        alt: product.title,
        order: 0,
      },
    });

    await prisma.digitalFile.create({
      data: {
        productId: record.id,
        name: `${product.title}.pdf`,
        description: 'Arquivo ilustrativo - substitua pelo material final pelo painel admin.',
        fileUrl: 'https://example.com/placeholder.pdf',
        fileSize: 1024,
        fileType: 'application/pdf',
        active: true,
      },
    });

    records.push(record);
  }
  return records;
}

async function createOrderWithPayment(options: {
  customer?: { id: string; name: string; email: string; phone?: string | null };
  createdAt: Date;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  includePreferenceLink: boolean;
  products: { id: string; title: string; price: number }[];
}) {
  const { items, subtotal } = buildItems(options.products);
  const shipping = subtotal > 80 ? 0 : 14.9;
  const total = Number((subtotal + shipping).toFixed(2));
  const address = randomChoice(SHIPPING_ADDRESSES);
  const customerName = options.customer?.name || `Cliente Guest ${randomInt(1000, 9999)}`;
  const customerEmail = options.customer?.email || `guest${Date.now()}${Math.random()}@teste.com`;
  const customerPhone = options.customer?.phone || `11${randomInt(900000000, 999999999)}`;

  const order = await prisma.order.create({
    data: {
      customerId: options.customer?.id || null,
      customerName,
      customerEmail,
      customerPhone,
      items,
      subtotal,
      shipping,
      total,
      status: options.status,
      paymentMethod: PaymentMethod.PIX,
      shippingAddress: address,
      trackingCode: SUCCESS_STATUSES.includes(options.status) ? `BR${randomInt(100000000, 999999999)}BR` : null,
      createdAt: options.createdAt,
      updatedAt: options.createdAt,
    },
  });

  await prisma.payment.create({
    data: {
      orderId: order.id,
      amount: total,
      method: PaymentMethod.PIX,
      status: options.paymentStatus,
      preferenceId: options.includePreferenceLink ? `PREF-${order.orderNumber}` : null,
      payerEmail: customerEmail,
      payerName: customerName,
      approvedAt: PAYMENT_SUCCESS.includes(options.paymentStatus) ? options.createdAt : undefined,
    },
  });

  if (SUCCESS_STATUSES.includes(options.status)) {
    for (const item of items) {
      await prisma.purchaseHistory.create({
        data: {
          orderId: order.id,
          customerEmail,
          customerName,
          productId: item.productId,
          productTitle: item.title,
          pricePaid: item.price * item.quantity,
          purchasedAt: options.createdAt,
        },
      });
    }
  }

  return order;
}

async function seedOrders(products: { id: string; title: string; price: number }[], customers: { id: string; name: string; email: string; phone?: string | null }[]) {
  const summary = {
    total: 0,
    approved: 0,
    pending: 0,
    byCustomer: [] as Array<{
      customer: { id: string; name: string; email: string };
      orders: Array<{ type: 'approved' | 'pending'; orderNumber: string; status: OrderStatus; createdAt: Date }>;
    }>,
  };

  // Cada cliente de teste recebe exatamente 2 pedidos (1 aprovado e 1 pendente)
  for (const customer of customers) {
    const deliveredOrder = await createOrderWithPayment({
      customer,
      products,
      createdAt: daysAgo(randomInt(10, 20)),
      status: 'DELIVERED',
      paymentStatus: 'APPROVED',
      includePreferenceLink: true,
    });

    const pendingOrder = await createOrderWithPayment({
      customer,
      products,
      createdAt: daysAgo(randomInt(1, 6)),
      status: 'PENDING',
      paymentStatus: 'PENDING',
      includePreferenceLink: false,
    });

    summary.total += 2;
    summary.approved += 1;
    summary.pending += 1;
    summary.byCustomer.push({
      customer,
      orders: [
        { type: 'approved', orderNumber: deliveredOrder.orderNumber, status: deliveredOrder.status, createdAt: deliveredOrder.createdAt },
        { type: 'pending', orderNumber: pendingOrder.orderNumber, status: pendingOrder.status, createdAt: pendingOrder.createdAt },
      ],
    });
  }

  return summary;
}

async function createNotifications(adminId: string) {
  const recentOrders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 8 });
  for (const order of recentOrders) {
    await prisma.notification.create({
      data: {
        userId: adminId,
        type: 'NEW_ORDER',
        title: `Novo pedido #${order.orderNumber}`,
        message: `Pedido de ${order.customerName} - R$ ${order.total.toFixed(2)}`,
        read: Math.random() > 0.5,
        data: { orderId: order.id },
        createdAt: order.createdAt,
      },
    });
  }
}

async function createSalesGoals() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  await prisma.salesGoal.upsert({
    where: { month_year: { month: currentMonth, year: currentYear } },
    update: { targetValue: 8000 },
    create: { month: currentMonth, year: currentYear, targetValue: 8000, description: 'Meta mês atual' },
  });

  await prisma.salesGoal.upsert({
    where: { month_year: { month: previousMonth, year: previousYear } },
    update: { targetValue: 6500 },
    create: { month: previousMonth, year: previousYear, targetValue: 6500, description: 'Meta mês anterior' },
  });
}

async function main() {
  console.log('🧹 Resetando base...');
  await resetDatabase();

  console.log('👑 Criando admin...');
  const admin = await createAdmin();

  console.log('👥 Criando clientes de teste...');
  const customers = await createCustomers();

  console.log('🛍️ Criando catálogo base...');
  const products = await createProducts();

  console.log('🧾 Gerando pedidos e pagamentos para 2 meses...');
  const summary = await seedOrders(products, customers);

  console.log('🔔 Criando notificações...');
  await createNotifications(admin.id);

  console.log('🎯 Ajustando metas de vendas...');
  await createSalesGoals();

  console.log('\nResumo:');
  console.log(`- Pedidos totais: ${summary.total}`);
  console.log(`- Pagamentos aprovados: ${summary.approved}`);
  console.log(`- Pagamentos pendentes: ${summary.pending}`);
  console.log('- Pedidos por cliente:');
  summary.byCustomer.forEach(({ customer, orders }) => {
    console.log(`  • ${customer.name} (${customer.email}):`);
    orders.forEach((order) => {
      const statusLabel = order.status.toLowerCase().replace(/_/g, ' ');
      const orderType = order.type === 'approved' ? 'Concluído' : 'Em andamento';
      console.log(`     - ${orderType} → Pedido #${order.orderNumber} (${statusLabel}) em ${order.createdAt.toISOString().split('T')[0]}`);
    });
  });
  console.log('\nAcesse com:');
  console.log(`Admin → ${ADMIN_CREDENTIALS.email} / ${ADMIN_CREDENTIALS.password}`);
  customers.forEach((customer, index) => {
    console.log(`Cliente #${index + 1} → ${customer.email} / ${CUSTOMER_FIXTURES[index].password}`);
  });

  console.log('\nPronto! Os produtos já possuem arquivos e imagens placeholders, basta substituí-los via painel se desejar.');
}

main()
  .catch((error) => {
    console.error('❌ Erro ao executar seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
