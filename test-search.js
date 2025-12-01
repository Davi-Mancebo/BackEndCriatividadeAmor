const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helpers de busca
function isNumericSearch(search) {
  const cleaned = search.replace(/[,\s]/g, '');
  return /^\d+(\.\d{1,2})?$/.test(cleaned);
}

function parseSearchAmount(search) {
  try {
    const cleaned = search.replace(/,/g, '.').replace(/\s/g, '');
    const amount = parseFloat(cleaned);
    return isNaN(amount) ? null : amount;
  } catch {
    return null;
  }
}

function isDateSearch(search) {
  return /^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(search);
}

function parseSearchDate(search) {
  try {
    const parts = search.split('/');
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parts[2] ? parseInt(parts[2]) : new Date().getFullYear();
    const fullYear = year < 100 ? 2000 + year : year;
    
    const start = new Date(fullYear, month, day, 0, 0, 0, 0);
    const end = new Date(fullYear, month, day, 23, 59, 59, 999);
    
    return { start, end };
  } catch {
    return null;
  }
}

async function testSearch(searchTerm) {
  console.log(`\n🔍 Testando busca: "${searchTerm}"\n`);

  const where = {};
  const searchConditions = [
    { id: { contains: searchTerm, mode: 'insensitive' } },
    { orderNumber: { contains: searchTerm, mode: 'insensitive' } },
    { customerName: { contains: searchTerm, mode: 'insensitive' } },
    { customerEmail: { contains: searchTerm, mode: 'insensitive' } },
    { trackingCode: { contains: searchTerm, mode: 'insensitive' } },
  ];

  if (isNumericSearch(searchTerm)) {
    const amount = parseSearchAmount(searchTerm);
    if (amount !== null) {
      console.log(`💰 Detectado busca por valor: R$ ${amount.toFixed(2)}`);
      searchConditions.push({ total: amount });
      searchConditions.push({ subtotal: amount });
    }
  }

  if (isDateSearch(searchTerm)) {
    const dateRange = parseSearchDate(searchTerm);
    if (dateRange) {
      console.log(`📅 Detectado busca por data: ${dateRange.start.toLocaleDateString('pt-BR')}`);
      searchConditions.push({
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      });
    }
  }

  where.OR = searchConditions;

  const orders = await prisma.order.findMany({
    where,
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      customerEmail: true,
      total: true,
      createdAt: true,
      status: true,
    },
    take: 5,
  });

  console.log(`✅ Encontrados: ${orders.length} pedidos\n`);

  orders.forEach((order, i) => {
    console.log(`${i + 1}. ${order.orderNumber} - ${order.customerName}`);
    console.log(`   R$ ${order.total.toFixed(2)} - ${order.createdAt.toLocaleDateString('pt-BR')} - ${order.status}`);
  });

  return orders.length;
}

async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  🔍 TESTE DE BUSCA MULTIFIELD - PEDIDOS  ║');
  console.log('╚════════════════════════════════════════════╝');

  const tests = [
    'ana oliveira',   // Nome completo
    'ana',            // Nome parcial
    '34,00',          // Valor com vírgula
    '34',             // Valor sem vírgula
    '21/11',          // Data dd/mm
    '21/11/2025',     // Data completa
  ];

  const results = [];

  for (const test of tests) {
    const count = await testSearch(test);
    results.push({ search: test, count });
  }

  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║           📊 RESUMO DOS TESTES            ║');
  console.log('╚════════════════════════════════════════════╝\n');

  results.forEach(({ search, count }) => {
    const status = count > 0 ? '✅' : '❌';
    console.log(`${status} "${search}": ${count} pedidos`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
