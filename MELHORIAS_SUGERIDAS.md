// PRODUTOS - MELHORIAS SUGERIDAS

// ========================================
// 1. REMOVER REDUNDÂNCIA DE CONVERSÃO
// ========================================

// ❌ ANTES:
body('price').isFloat({ min: 0 })
price: parseFloat(price)

// ✅ DEPOIS:
body('price').toFloat().isFloat({ min: 0 })
// price já vem como number!


// ========================================
// 2. CORRIGIR CONVERSÃO DE BOOLEAN
// ========================================

// ❌ ANTES:
featured: featured === true, // Só aceita boolean true

// ✅ DEPOIS:
featured: Boolean(featured), // Aceita true, "true", 1


// ========================================
// 3. UNIFICAR CAMPO DE IMAGEM
// ========================================

// OPÇÃO A - Usar apenas `image` (string única)
// Schema:
image: String?
// ❌ Remove: images Json?

// OPÇÃO B - Usar apenas `images` (array)
// Schema:
images: Json? // ['url1.jpg', 'url2.jpg']
// ❌ Remove: image String?


// ========================================
// 4. ADICIONAR VALIDAÇÕES FALTANTES
// ========================================

validate([
  body('title').notEmpty(),
  body('price').toFloat().isFloat({ min: 0 }),
  body('stock').optional().toInt().isInt({ min: 0 }),
  body('comparePrice').optional().toFloat().isFloat({ min: 0 }), // ✅ NOVO
  body('category').optional().isString().trim(), // ✅ NOVO
  body('tags').optional().isArray(), // ✅ NOVO
  body('featured').optional().toBoolean(), // ✅ NOVO
])


// ========================================
// 5. EXTRAIR NOTIFICAÇÃO PARA FUNÇÃO
// ========================================

async function checkLowStock(productId: string, userId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (product && product.stock <= 5 && product.stock > 0) {
    await prisma.notification.create({
      data: {
        userId,
        type: 'LOW_STOCK',
        title: 'Estoque baixo',
        message: `${product.title} tem apenas ${product.stock} unidades`,
        data: { productId: product.id },
      },
    });
  }
}

// Usar em POST e PUT:
await checkLowStock(product.id, req.userId!);


// ========================================
// 6. VALIDAR SKU ÚNICO
// ========================================

// Adicionar no POST:
if (sku) {
  const existingSku = await prisma.product.findUnique({
    where: { sku },
  });
  if (existingSku) {
    throw new AppError('SKU já cadastrado', 400);
  }
}


// ========================================
// 7. CORRIGIR BUSCA POR TAGS
// ========================================

// ❌ ANTES:
where.OR = [
  { tags: { hasSome: [search] } } // Só encontra match exato
]

// ✅ DEPOIS:
where.OR = [
  { title: { contains: search, mode: 'insensitive' } },
  { description: { contains: search, mode: 'insensitive' } },
  { tags: { has: search } }, // Tag exata
  // OU buscar em todas as tags:
  { tags: { array_contains: search } } // Se usar PostgreSQL
]


// ========================================
// 8. ADICIONAR TRANSAÇÃO PARA OPERAÇÕES MÚLTIPLAS
// ========================================

// Se criar produto E notificação juntos:
const result = await prisma.$transaction(async (tx) => {
  const product = await tx.product.create({ data: {...} });
  
  if (product.stock <= 5) {
    await tx.notification.create({ data: {...} });
  }
  
  return product;
});


// ========================================
// 9. SOFT DELETE EM VEZ DE DELETE
// ========================================

// ❌ ANTES:
await prisma.product.delete({ where: { id } });

// ✅ DEPOIS (já tem o campo `active`):
await prisma.product.update({
  where: { id },
  data: { active: false }
});


// ========================================
// 10. ADICIONAR LOGS DE AUDITORIA
// ========================================

console.log(`[PRODUCT_CREATE] User ${req.userId} created product ${product.id}`);
console.log(`[PRODUCT_UPDATE] User ${req.userId} updated product ${id}`);
console.log(`[PRODUCT_DELETE] User ${req.userId} deleted product ${id}`);
