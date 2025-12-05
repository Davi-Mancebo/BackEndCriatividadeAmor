import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔔 Criando notificações de teste...\n');

  // Buscar admin
  const admin = await prisma.user.findFirst();
  if (!admin) {
    console.error('❌ Admin não encontrado');
    return;
  }

  // Buscar alguns pedidos para usar nas notificações
  const pedidos = await prisma.order.findMany({ take: 5 });

  const notificacoes = [
    // NÃO LIDAS (15)
    { type: 'NEW_ORDER', title: 'Novo pedido recebido', message: 'Pedido #1234 - Cliente: Maria Silva', read: false },
    { type: 'LOW_STOCK', title: 'Estoque baixo', message: 'Produto teste345 com apenas 3 unidades', read: false },
    { type: 'NEW_ORDER', title: 'Novo pedido recebido', message: 'Pedido #1235 - Cliente: João Santos', read: false },
    { type: 'REVIEW', title: 'Nova avaliação', message: 'Cliente avaliou o produto teste3 com 5 estrelas', read: false },
    { type: 'NEW_ORDER', title: 'Novo pedido recebido', message: 'Pedido #1236 - Cliente: Ana Costa', read: false },
    { type: 'LOW_STOCK', title: 'Estoque baixo', message: 'Produto 312312312 com apenas 2 unidades', read: false },
    { type: 'NEW_ORDER', title: 'Novo pedido recebido', message: 'Pedido #1237 - Cliente: Pedro Lima', read: false },
    { type: 'REVIEW', title: 'Nova avaliação', message: 'Cliente avaliou o produto teste345 com 4 estrelas', read: false },
    { type: 'NEW_ORDER', title: 'Novo pedido recebido', message: 'Pedido #1238 - Cliente: Carla Mendes', read: false },
    { type: 'NEW_ORDER', title: 'Novo pedido recebido', message: 'Pedido #1239 - Cliente: Lucas Rocha', read: false },
    { type: 'LOW_STOCK', title: 'Estoque crítico', message: 'Produto teste3 com apenas 1 unidade', read: false },
    { type: 'NEW_ORDER', title: 'Novo pedido recebido', message: 'Pedido #1240 - Cliente: Fernanda Alves', read: false },
    { type: 'REVIEW', title: 'Nova avaliação', message: 'Cliente avaliou o produto 312312312 com 5 estrelas', read: false },
    { type: 'NEW_ORDER', title: 'Novo pedido recebido', message: 'Pedido #1241 - Cliente: Roberto Ferreira', read: false },
    { type: 'NEW_ORDER', title: 'Novo pedido recebido', message: 'Pedido #1242 - Cliente: Juliana Martins', read: false },

    // LIDAS (5)
    { type: 'NEW_ORDER', title: 'Pedido confirmado', message: 'Pedido #1200 foi confirmado', read: true },
    { type: 'NEW_ORDER', title: 'Pedido enviado', message: 'Pedido #1201 foi enviado', read: true },
    { type: 'LOW_STOCK', title: 'Estoque reposto', message: 'Estoque do produto teste345 foi reposto', read: true },
    { type: 'REVIEW', title: 'Avaliação respondida', message: 'Você respondeu uma avaliação', read: true },
    { type: 'NEW_ORDER', title: 'Pedido entregue', message: 'Pedido #1202 foi entregue com sucesso', read: true },
  ];

  let created = 0;
  for (const notif of notificacoes) {
    const dataNotif: any = {};
    if (pedidos[created % pedidos.length]) {
      dataNotif.orderId = pedidos[created % pedidos.length].id;
    }

    await prisma.notification.create({
      data: {
        userId: admin.id,
        type: notif.type as any,
        title: notif.title,
        message: notif.message,
        read: notif.read,
        data: dataNotif,
      },
    });
    created++;
  }

  console.log(`✅ ${created} notificações criadas`);
  console.log(`   📬 ${notificacoes.filter(n => !n.read).length} não lidas`);
  console.log(`   ✅ ${notificacoes.filter(n => n.read).length} lidas`);

  await prisma.$disconnect();
}

main().catch(console.error);
