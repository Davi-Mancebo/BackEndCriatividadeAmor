import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const metas = await prisma.salesGoal.findMany({
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  console.log('\n=== VERIFICAÇÃO DAS METAS ===\n');

  for (const meta of metas) {
    // Pedidos do mês (status que contam como venda)
    const pedidos = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: new Date(meta.year, meta.month - 1, 1),
          lt: new Date(meta.year, meta.month, 1),
        },
        status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
      },
    });

    const totalVendido = pedidos.reduce((sum, p) => sum + p.total, 0);
    const percentual = ((totalVendido / meta.targetValue) * 100).toFixed(1);
    
    const mesNome = ['', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][meta.month];

    console.log(`📅 ${mesNome}/${meta.year}`);
    console.log(`   Meta: R$ ${meta.targetValue.toFixed(2)}`);
    console.log(`   Vendido: R$ ${totalVendido.toFixed(2)}`);
    console.log(`   Pedidos: ${pedidos.length}`);
    console.log(`   Alcançado: ${percentual}%`);
    console.log('');
  }

  await prisma.$disconnect();
}

check().catch(console.error);
