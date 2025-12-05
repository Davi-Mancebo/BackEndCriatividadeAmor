import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Criar usuário admin padrão
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@criatividade.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@criatividade.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log('✅ Usuário admin criado:', admin.email);

  // Criar usuário comum para testes
  const customerPassword = await bcrypt.hash('cliente123', 10);
  
  const customer = await prisma.user.upsert({
    where: { email: 'cliente@criatividade.com' },
    update: {},
    create: {
      name: 'Cliente Teste',
      email: 'cliente@criatividade.com',
      password: customerPassword,
      role: 'CUSTOMER',
    },
  });

  console.log('✅ Usuário cliente criado:', customer.email);

  // Criar produtos de exemplo
  const products = await Promise.all([
    prisma.product.create({
      data: {
        title: 'Colar Artesanal Floral',
        description: 'Lindo colar artesanal com detalhes florais feito à mão',
        price: 89.90,
        comparePrice: 129.90,
        stock: 15,
        category: 'Acessórios',
        tags: ['colar', 'artesanal', 'floral'],
        featured: true,
        sku: 'COL-001',
        type: 'PHYSICAL',
      },
    }),
    prisma.product.create({
      data: {
        title: 'Brincos de Resina',
        description: 'Brincos exclusivos feitos com resina e flores naturais',
        price: 45.00,
        stock: 30,
        category: 'Acessórios',
        tags: ['brincos', 'resina', 'flores'],
        featured: true,
        sku: 'BRI-001',
        type: 'PHYSICAL',
      },
    }),
    prisma.product.create({
      data: {
        title: 'Jogo da Velha Interativo - PDF',
        description: 'Jogo da velha digital para imprimir e recortar. Arquivo PDF pronto para uso!',
        price: 15.00,
        stock: 999,
        category: 'Produtos Digitais',
        tags: ['pdf', 'jogo', 'educativo', 'digital'],
        featured: true,
        sku: 'PDF-001',
        type: 'DIGITAL',
      },
    }),
  ]);

  console.log(`✅ ${products.length} produtos criados`);

  // Criar pedidos de exemplo
  const orders = await Promise.all([
    prisma.order.create({
      data: {
        customerName: 'Maria Silva',
        customerEmail: 'maria@email.com',
        customerPhone: '(11) 98765-4321',
        items: [
          {
            productId: products[0].id,
            title: products[0].title,
            price: products[0].price,
            quantity: 1,
          },
        ],
        subtotal: 89.90,
        shipping: 15.00,
        total: 104.90,
        status: 'PROCESSING',
        trackingCode: 'BR123456789',
        shippingAddress: {
          street: 'Rua das Flores, 123',
          city: 'São Paulo',
          state: 'SP',
          zip: '01234-567',
          country: 'Brasil',
        },
      },
    }),
    prisma.order.create({
      data: {
        customerName: 'João Santos',
        customerEmail: 'joao@email.com',
        customerPhone: '(21) 91234-5678',
        items: [
          {
            productId: products[1].id,
            title: products[1].title,
            price: products[1].price,
            quantity: 2,
          },
        ],
        subtotal: 90.00,
        shipping: 12.00,
        total: 102.00,
        status: 'PENDING',
      },
    }),
  ]);

  console.log(`✅ ${orders.length} pedidos criados`);

  // Criar notificações de exemplo
  await prisma.notification.create({
    data: {
      userId: admin.id,
      type: 'NEW_ORDER',
      title: 'Novo pedido recebido',
      message: `Pedido #${orders[1].orderNumber} de João Santos`,
      data: { orderId: orders[1].id },
    },
  });

  console.log('✅ Notificações criadas');
  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('\n📧 Login: admin@criatividade.com');
  console.log('🔑 Senha: admin123\n');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
