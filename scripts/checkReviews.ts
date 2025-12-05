import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const produtos = await prisma.product.findMany({
    where: {
      title: { in: ['teste345', 'teste3', '312312312'] },
    },
  });

  console.log('\n=== REVIEWS DOS PRODUTOS ===\n');

  for (const prod of produtos) {
    const reviews = await prisma.review.findMany({
      where: { productId: prod.id },
    });

    console.log(`📦 ${prod.title} (R$ ${prod.price})`);
    console.log(`   Reviews: ${reviews.length}`);
    
    if (reviews.length > 0) {
      const media = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      console.log(`   Média: ${media.toFixed(1)} estrelas`);
    }
    console.log('');
  }

  await prisma.$disconnect();
}

check().catch(console.error);
