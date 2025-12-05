import prisma from '../src/lib/prisma';

async function main() {
  const email = 'cliente@criatividade.com';

  const user = await prisma.user.findUnique({ where: { email } });
  console.log('User:', user);

  const purchases = await prisma.purchaseHistory.findMany({
    where: { customerEmail: email },
  });
  console.log('Purchases:', purchases);
}

main()
  .catch(console.error)
  .finally(async () => prisma.$disconnect());
