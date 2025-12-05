import prisma from '../src/lib/prisma';

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: 'admin@criatividade.com' } });
  console.log(admin);
}

main()
  .catch(console.error)
  .finally(async () => prisma.$disconnect());
