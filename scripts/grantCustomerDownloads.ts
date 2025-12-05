import prisma from '../src/lib/prisma';

const CUSTOMER_EMAIL = 'cliente@criatividade.com';
const CUSTOMER_NAME = 'Cliente Teste';

const DIGITAL_FILES = [
  {
    title: 'teste345',
    name: 'Kit Criativo teste345.pdf',
    description: 'Arquivo principal do produto teste345 pronto para download.',
    fileUrl: 'https://filesamples.com/samples/document/pdf/sample3.pdf',
    fileSize: 1_280_000, // ~1.2MB
  },
  {
    title: 'teste3',
    name: 'Coleção Amor & Criatividade - teste3.pdf',
    description: 'Material completo do produto teste3.',
    fileUrl: 'https://filesamples.com/samples/document/pdf/sample1.pdf',
    fileSize: 980_000, // ~0.9MB
  },
];

async function main() {
  console.log('🔐 Liberando downloads para o cliente de teste...');

  const products = await prisma.product.findMany({
    where: {
      title: { in: DIGITAL_FILES.map((file) => file.title) },
    },
  });

  const selected: { product: typeof products[number]; fileId: string }[] = [];

  for (const config of DIGITAL_FILES) {
    const product = products.find((p) => p.title === config.title);
    if (!product) {
      console.warn(`⚠️ Produto "${config.title}" não encontrado. Pulando.`);
      continue;
    }

    if (product.type !== 'DIGITAL') {
      console.warn(`⚠️ Produto "${product.title}" não é digital. Pulando.`);
      continue;
    }

    let digitalFile = await prisma.digitalFile.findFirst({
      where: { productId: product.id },
    });

    if (!digitalFile) {
      digitalFile = await prisma.digitalFile.create({
        data: {
          productId: product.id,
          name: config.name,
          description: config.description,
          fileUrl: config.fileUrl,
          fileSize: config.fileSize,
          fileType: 'application/pdf',
          active: true,
        },
      });

      console.log(`📄 Arquivo digital criado para ${product.title}`);
    } else {
      console.log(`ℹ️ Produto ${product.title} já possuía arquivo digital`);
    }

    selected.push({ product, fileId: digitalFile.id });
  }

  if (!selected.length) {
    console.warn('Nenhum produto elegível encontrado. Nada foi alterado.');
    return;
  }

  const subtotal = selected.reduce((sum, entry) => sum + Number(entry.product.price), 0);

  let order = await prisma.order.findFirst({
    where: {
      customerEmail: CUSTOMER_EMAIL,
      notes: 'Pedido automático para liberar downloads do cliente teste.',
    },
  });

  if (!order) {
    order = await prisma.order.create({
      data: {
        customerName: CUSTOMER_NAME,
        customerEmail: CUSTOMER_EMAIL,
        items: selected.map(({ product }) => ({
          productId: product.id,
          title: product.title,
          price: product.price,
          quantity: 1,
        })),
        subtotal,
        shipping: 0,
        total: subtotal,
        status: 'DELIVERED',
        notes: 'Pedido automático para liberar downloads do cliente teste.',
      },
    });

    console.log(`🧾 Pedido ${order.orderNumber} criado para o cliente teste.`);
  } else {
    console.log(`ℹ️ Pedido existente reutilizado (${order.orderNumber}).`);
  }

  for (const { product } of selected) {
    const existingPurchase = await prisma.purchaseHistory.findFirst({
      where: {
        customerEmail: CUSTOMER_EMAIL,
        productId: product.id,
      },
    });

    if (!existingPurchase) {
      await prisma.purchaseHistory.create({
        data: {
          orderId: order.id,
          customerEmail: CUSTOMER_EMAIL,
          customerName: CUSTOMER_NAME,
          productId: product.id,
          productTitle: product.title,
          pricePaid: product.price,
        },
      });

      console.log(`🛒 Compra registrada para ${product.title}.`);
    } else {
      console.log(`ℹ️ Cliente já possuía acesso a ${product.title}.`);
    }
  }

  console.log('✅ Downloads liberados com sucesso!');
}

main()
  .catch((error) => {
    console.error('❌ Erro ao liberar downloads:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
