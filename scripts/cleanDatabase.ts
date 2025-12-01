import prisma from '../src/lib/prisma';

async function main() {
  await prisma.customer.deleteMany(); // customers
  await prisma.order.deleteMany(); // orders
  await prisma.payment.deleteMany(); // payments
  await prisma.notification.deleteMany(); // notifications
  await prisma.review.deleteMany(); // reviews
  await prisma.purchaseHistory.deleteMany(); // purchase_history
  await prisma.salesGoal.deleteMany(); // sales_goals
  await prisma.promotion.deleteMany(); // promotions
  await prisma.digitalFile.deleteMany(); // digital_files
  await prisma.user.deleteMany(); // users
  // Não exclua produtos nem imagens!
  console.log('Banco limpo! Apenas produtos e imagens mantidos.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
