# 🎯 Decisões de Arquitetura - Explicação Completa

## 1. 🖼️ IMAGEM PRINCIPAL - BACK vs FRONT

### ✅ **DECISÃO: BACK (campo `order`)**

**Como funciona:**
```prisma
ProductImage {
  order: Int @default(0) // 0 = principal, 1,2,3... = secundárias
}
```

**Por que no BACK?**

| Aspecto | BACK | FRONT |
|---------|------|-------|
| **Consistência** | ✅ Todos veem a mesma | ❌ Pode variar por cliente |
| **Performance** | ✅ Uma query | ❌ Ordenar toda vez |
| **SEO** | ✅ Meta tags corretas | ❌ Depende de JS |
| **Cache** | ✅ Fácil de cachear | ❌ Mais complexo |
| **Manutenção** | ✅ Uma fonte de verdade | ❌ Lógica duplicada |

**Exemplo prático:**
```typescript
// Pegar imagem principal
const mainImage = product.images.find(img => img.order === 0);

// OU na query
const product = await prisma.product.findUnique({
  include: {
    images: {
      where: { order: 0 }, // Só a principal
    }
  }
});
```

---

## 2. 📦 TIPO E ESTADO DO PRODUTO

### ✅ **DECISÃO: BACK (enums)**

**Implementado:**
```prisma
enum ProductType {
  PHYSICAL    // Precisa calcular frete
  DIGITAL     // Não tem frete, entrega instantânea
  SERVICE     // Agendamento, sem entrega física
}

enum ProductCondition {
  NEW         // Produto novo
  USED        // Produto usado
  REFURBISHED // Recondicionado
}
```

**Por que no BACK?**

✅ **Validação automática**: Banco só aceita valores válidos  
✅ **Type safety**: TypeScript gera tipos automaticamente  
✅ **Performance**: Filtros indexados  
✅ **Regras de negócio**: 
```typescript
// Ex: Digital não precisa peso
if (product.type === 'DIGITAL') {
  // Não calcular frete
  // Entregar arquivo após pagamento
}

if (product.type === 'PHYSICAL') {
  // Calcular frete baseado em weight
  // Gerar etiqueta de envio
}
```

**Uso no frontend:**
```json
GET /api/products/123
{
  "id": "123",
  "title": "E-book PDF",
  "type": "DIGITAL",    // ← Frontend ajusta UI
  "condition": "NEW",
  "weight": null        // Digital não tem peso
}
```

---

## 3. 💰 PROMOÇÕES - Como Salvar?

### ✅ **DECISÃO: Tabela separada `Promotion`**

**Estrutura:**
```prisma
model Promotion {
  id: String
  productId: String
  name: "Black Friday"
  discountPercent: 30.0  // OU
  discountAmount: 50.00  // Não ambos
  startDate: DateTime    // Agendamento
  endDate: DateTime      // Expira automaticamente
  active: Boolean        // On/off manual
}
```

**Comparação de abordagens:**

| Abordagem | Vantagens | Desvantagens |
|-----------|-----------|--------------|
| **Campo no Product** | Simples | ❌ Sem histórico<br>❌ Sem agendamento<br>❌ Sem múltiplas promoções |
| **Tabela separada** ✅ | ✅ Histórico completo<br>✅ Agendamento<br>✅ Múltiplas promoções<br>✅ Analytics | Mais complexo |
| **JSON no Product** | Flexível | ❌ Difícil de consultar<br>❌ Sem validação |

**Como funciona:**

```typescript
// Criar promoção agendada
POST /api/promotions
{
  "productId": "123",
  "name": "Cyber Monday",
  "discountPercent": 40,
  "startDate": "2025-12-01T00:00:00Z",
  "endDate": "2025-12-02T23:59:59Z"
}

// Backend calcula automaticamente
const now = new Date();
const activePromotion = await prisma.promotion.findFirst({
  where: {
    productId: "123",
    active: true,
    startDate: { lte: now }, // Já começou
    endDate: { gte: now },   // Ainda não terminou
  }
});

// Resposta
{
  "product": {
    "price": 100,
    "finalPrice": 60,      // 40% off
    "savings": 40,
    "hasPromotion": true
  }
}
```

**Benefícios:**

1. **Agendamento**: Crie hoje, ativa amanhã automaticamente
2. **Histórico**: Todas as promoções passadas ficam salvas
3. **Analytics**: Qual promoção vendeu mais?
4. **A/B Testing**: Testar diferentes descontos
5. **Expiração automática**: Não precisa desativar manualmente

---

## 4. ⏰ TIMESTAMPS - CreatedAt e UpdatedAt

### ✅ **STATUS: Todos têm!**

**Verificação:**

```prisma
// ✅ User
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

// ✅ Product
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

// ✅ Order
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

// ✅ ProductImage (NOVO - adicionado agora)
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt  // ← Adicionado!

// ✅ Promotion (NOVO)
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

// ⚠️ Notification - só createdAt
// (Notificação não muda após criada)
```

**Como funcionam:**

```typescript
// @default(now()) - Prisma preenche automaticamente ao criar
const product = await prisma.product.create({
  data: { title: "Produto" }
  // createdAt será preenchido automaticamente
});

// @updatedAt - Prisma atualiza automaticamente em QUALQUER update
await prisma.product.update({
  where: { id: "123" },
  data: { title: "Novo título" }
  // updatedAt será atualizado automaticamente
});
```

**Para que servem?**

✅ **Auditoria**: Quando foi criado/modificado?  
✅ **Ordenação**: Produtos mais recentes  
✅ **Analytics**: Produtos criados por mês  
✅ **Cache**: Invalidar se updatedAt mudou  
✅ **Sincronização**: Sync apenas o que mudou  

**Exemplo prático:**
```typescript
// Produtos modificados nas últimas 24h
const recentlyUpdated = await prisma.product.findMany({
  where: {
    updatedAt: {
      gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
    }
  }
});

// Produtos criados em novembro
const novemberProducts = await prisma.product.findMany({
  where: {
    createdAt: {
      gte: new Date('2025-11-01'),
      lt: new Date('2025-12-01')
    }
  }
});
```

---

## 5. 🎁 SISTEMA COMPLETO DE PROMOÇÕES

### **Rotas implementadas:**

```bash
# Criar promoção
POST /api/promotions
{
  "productId": "uuid",
  "name": "Black Friday",
  "discountPercent": 50,  # OU discountAmount: 100
  "startDate": "2025-12-01T00:00:00Z",
  "endDate": "2025-12-07T23:59:59Z"
}

# Listar promoções
GET /api/promotions
GET /api/promotions?active=true
GET /api/promotions?productId=uuid

# Ver promoção ativa de um produto
GET /api/promotions/product/:productId/active
# Retorna:
{
  "hasPromotion": true,
  "product": {
    "price": 100,
    "finalPrice": 50,
    "savings": 50,
    "discountPercent": 50
  }
}

# Atualizar promoção
PUT /api/promotions/:id

# Deletar promoção
DELETE /api/promotions/:id
```

### **Integração automática:**

Quando você busca produtos, a promoção ativa já vem junto:

```typescript
GET /api/products/123
{
  "id": "123",
  "title": "Produto",
  "price": 100,
  "type": "PHYSICAL",
  "condition": "NEW",
  "images": [...],
  "promotions": [
    {
      "name": "Black Friday",
      "discountPercent": 50,
      "endDate": "2025-12-07T23:59:59Z"
    }
  ]
}
```

**Frontend calcula:**
```javascript
const hasPromo = product.promotions.length > 0;
const promo = product.promotions[0];
const finalPrice = promo.discountPercent 
  ? product.price * (1 - promo.discountPercent/100)
  : product.price - promo.discountAmount;
```

---

## 📊 RESUMO DAS DECISÕES:

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| **Imagem principal** | ✅ BACK (order) | Consistência, SEO, performance |
| **Tipo do produto** | ✅ BACK (enum) | Validação, type safety, regras de negócio |
| **Estado/condição** | ✅ BACK (enum) | Validação, filtros, UX |
| **Promoções** | ✅ Tabela separada | Histórico, agendamento, analytics |
| **Timestamps** | ✅ Todos têm | Auditoria, ordenação, sync |

---

## 🚀 PRÓXIMOS PASSOS:

```bash
# 1. Executar migration
npm run prisma:migrate
# Nome: "add_promotions_and_product_types"

# 2. Ver as mudanças
npm run prisma:studio

# 3. Testar
npm run dev
```

---

## 💡 DICA EXTRA: Preços com Histórico

Se quiser rastrear mudanças de preço:

```prisma
model PriceHistory {
  id: String
  productId: String
  price: Float
  comparePrice: Float?
  reason: String // "promoção", "ajuste", "custo"
  createdAt: DateTime
}
```

Sempre que alterar o preço, salva no histórico!
