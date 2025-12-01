const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n📊 Contagem de pedidos por STATUS:\n');
  
  const ordersByStatus = await prisma.order.groupBy({
    by: ['status'],
    _count: {
      status: true
    },
    orderBy: {
      _count: {
        status: 'desc'
      }
    }
  });

  ordersByStatus.forEach(item => {
    console.log(`${item.status.padEnd(20)} : ${item._count.status} pedidos`);
  });

  console.log('\n📊 Contagem de pedidos por MÉTODO DE PAGAMENTO:\n');
  
  const ordersByPayment = await prisma.order.groupBy({
    by: ['paymentMethod'],
    _count: {
      paymentMethod: true
    },
    orderBy: {
      _count: {
        paymentMethod: 'desc'
      }
    }
  });

  ordersByPayment.forEach(item => {
    console.log(`${item.paymentMethod.padEnd(20)} : ${item._count.paymentMethod} pedidos`);
  });

  console.log('\n📊 Total de pedidos:', await prisma.order.count());

  await prisma.$disconnect();
}

main().catch(console.error);
