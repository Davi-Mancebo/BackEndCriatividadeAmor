# 🔐 Organização de Rotas - Backend Criatividade & Amor

## 📊 Estado Atual das Rotas

### ✅ **ROTAS PÚBLICAS** (Sem autenticação)

#### 🛍️ **Cliente/Customer**
```
GET  /api/products                          - Listar produtos (catálogo)
GET  /api/products/:id                      - Ver detalhes do produto
GET  /api/products/:id/reviews              - Ver avaliações
GET  /api/products/:productId/images        - Ver imagens

GET  /api/purchases/my-products             - Produtos comprados (por email)
GET  /api/purchases/verify                  - Verificar se comprou produto

GET  /api/digital-files/download/:productId - Download arquivos (se comprou)
GET  /api/digital-files/check/:productId    - Verificar acesso a download

POST /api/payments/create                   - Criar pagamento
POST /api/payments/webhook                  - Webhook Mercado Pago
GET  /api/payments/status/:orderId          - Status do pagamento

POST /api/auth/login                        - Login
```

---

### 🔒 **ROTAS AUTENTICADAS** (Requer token JWT)

#### 👤 **Perfil do Usuário** (Cliente ou Admin)
```
GET  /api/auth/me                           - Dados do usuário logado
PUT  /api/auth/profile                      - Atualizar perfil
POST /api/auth/logout                       - Logout
```

#### ⚠️ **ROTAS SEM SEPARAÇÃO CLARA** (Atualmente requerem auth, mas devem ser públicas/cliente)
```
POST /api/reviews                           - ❌ Deveria ser CLIENTE (criar avaliação)
GET  /api/reviews                           - ❌ Deveria ser ADMIN
PUT  /api/reviews/:id                       - ❌ Deveria ser ADMIN
DELETE /api/reviews/:id                     - ❌ Deveria ser ADMIN

GET  /api/promotions                        - ❌ Deveria ser PÚBLICA
GET  /api/promotions/:id                    - ❌ Deveria ser PÚBLICA
GET  /api/promotions/product/:productId/active - ❌ Deveria ser PÚBLICA
```

---

### 👑 **ROTAS ADMINISTRATIVAS** (Requer auth + role ADMIN)

#### 📦 **Gestão de Produtos**
```
POST   /api/products                        - Criar produto
PUT    /api/products/:id                    - Atualizar produto
DELETE /api/products/:id                    - Desativar produto
DELETE /api/products/:id/permanent          - Deletar permanentemente

POST   /api/products/:productId/images      - Adicionar imagem
POST   /api/products/:productId/images/bulk - Múltiplas imagens
PUT    /api/products/:productId/images/reorder - Reordenar
PUT    /api/products/:productId/images/:imageId - Atualizar imagem
DELETE /api/products/:productId/images/:imageId - Deletar imagem
```

#### 📝 **Gestão de Pedidos**
```
GET  /api/orders                            - Listar pedidos
GET  /api/orders/stats                      - Estatísticas
GET  /api/orders/:id                        - Detalhes do pedido
PUT  /api/orders/:id                        - Atualizar status
POST /api/orders                            - Criar pedido manual
```

#### 👥 **Gestão de Clientes**
```
GET    /api/customers                       - Listar clientes
GET    /api/customers/stats                 - Estatísticas
GET    /api/customers/:id                   - Detalhes do cliente
DELETE /api/customers/:id                   - Deletar cliente
```

#### 🎯 **Gestão de Metas de Vendas**
```
GET    /api/sales-goals                     - Listar metas
GET    /api/sales-goals/current             - Meta atual
GET    /api/sales-goals/:month/:year        - Meta específica
POST   /api/sales-goals                     - Criar meta
PUT    /api/sales-goals/current             - Atualizar meta atual
PUT    /api/sales-goals/:month/:year        - Atualizar meta
DELETE /api/sales-goals/:id                 - Deletar por ID
DELETE /api/sales-goals/:month/:year        - Deletar por mês/ano
```

#### 🔔 **Notificações** (Admin)
```
GET    /api/notifications                   - Listar notificações
PUT    /api/notifications/:id/read          - Marcar como lida
PUT    /api/notifications/read-all          - Marcar todas
DELETE /api/notifications/:id               - Deletar
```

#### 🎁 **Gestão de Promoções**
```
POST   /api/promotions                      - Criar promoção
PUT    /api/promotions/:id                  - Atualizar
DELETE /api/promotions/:id                  - Deletar
```

#### 💳 **Gestão de Pagamentos**
```
GET  /api/payments                          - Listar pagamentos
GET  /api/payments/:id                      - Detalhes
GET  /api/payments/stats/overview           - Estatísticas
POST /api/payments/:id/refund               - Reembolso
```

#### 📁 **Gestão de Arquivos Digitais**
```
POST   /api/digital-files/:productId        - Adicionar arquivo
GET    /api/digital-files/:productId        - Listar arquivos
PUT    /api/digital-files/:fileId           - Atualizar
DELETE /api/digital-files/:fileId           - Deletar
GET    /api/digital-files/stats/overview    - Estatísticas
```

---

## 🔧 **Melhorias Sugeridas**

### 1️⃣ **Separar Rotas de Reviews**

#### ❌ **Problema Atual**
```typescript
// reviews.routes.ts - TODAS sem middleware definido
POST /api/reviews          - Criar (deveria ser CLIENTE)
GET  /api/reviews          - Listar (deveria ser ADMIN)
PUT  /api/reviews/:id      - Atualizar (deveria ser ADMIN)
DELETE /api/reviews/:id    - Deletar (deveria ser ADMIN)
```

#### ✅ **Solução**
```typescript
// PÚBLICAS/CLIENTE
POST /api/reviews                    - Cliente criar avaliação (com email)
GET  /api/products/:id/reviews       - Ver avaliações (já implementado)

// ADMIN
GET    /api/reviews                  - Listar todas (admin)
PUT    /api/reviews/:id/verify       - Verificar avaliação (admin)
DELETE /api/reviews/:id              - Deletar (admin)
```

---

### 2️⃣ **Tornar Promoções Públicas**

#### ❌ **Problema Atual**
```typescript
// promotions.routes.ts
router.use(authMiddleware); // TODAS protegidas
```

#### ✅ **Solução**
```typescript
// PÚBLICAS (Cliente precisa ver promoções)
GET /api/promotions                         - Listar promoções ativas
GET /api/promotions/:id                     - Ver detalhes
GET /api/promotions/product/:productId/active - Promoção ativa do produto

// ADMIN
POST   /api/promotions                      - Criar
PUT    /api/promotions/:id                  - Atualizar
DELETE /api/promotions/:id                  - Deletar
```

---

### 3️⃣ **Criar Middleware de Cliente**

Adicionar `customerMiddleware` para ações que requerem autenticação mas não precisam ser admin:

```typescript
// auth.middleware.ts
export const customerMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Qualquer usuário autenticado (ADMIN ou CUSTOMER)
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao verificar usuário' });
  }
};
```

**Usar em:**
- Criar reviews
- Ver minhas compras (alternativa ao email público)
- Criar pedidos próprios

---

### 4️⃣ **Separar Rotas de Pedidos**

#### ❌ **Problema Atual**
```typescript
// orders.routes.ts
router.use(authMiddleware); // TODAS protegidas como admin
```

#### ✅ **Solução**
```typescript
// PÚBLICAS
POST /api/orders                     - Cliente criar pedido (checkout)

// CLIENTE AUTENTICADO
GET /api/orders/my-orders            - Ver meus pedidos (por email ou auth)
GET /api/orders/:id/track            - Rastrear meu pedido

// ADMIN
GET /api/orders                      - Listar todos
GET /api/orders/stats                - Estatísticas
GET /api/orders/:id                  - Detalhes completos
PUT /api/orders/:id                  - Atualizar status
```

---

## 📋 **Resumo de Ações Necessárias**

### ✅ **JÁ CORRETO**
- ✅ Products (GET público, POST/PUT/DELETE admin)
- ✅ Payments (rotas públicas separadas de admin)
- ✅ Digital Files (download público, gestão admin)
- ✅ Purchases (consultas públicas)
- ✅ Customers (100% admin)
- ✅ Sales Goals (100% admin)
- ✅ Notifications (100% admin)

### 🔧 **PRECISA AJUSTAR**
1. **Reviews** - Separar criação (público/cliente) de gestão (admin)
2. **Promotions** - Tornar listagem/visualização pública, manter gestão admin
3. **Orders** - Criar rotas públicas para checkout e rastreamento
4. **Auth** - Adicionar `customerMiddleware` opcional

---

## 🎯 **Proposta de Estrutura Final**

```
📁 src/routes/
├── 🌐 PUBLIC (sem auth)
│   ├── products.routes.ts       - GET catálogo
│   ├── promotions.routes.ts     - GET promoções ativas
│   ├── payments.routes.ts       - POST create, webhook
│   ├── purchases.routes.ts      - GET verificar compras
│   └── digital-files.routes.ts  - GET download
│
├── 👤 CUSTOMER (auth, qualquer role)
│   ├── reviews.routes.ts        - POST criar avaliação
│   ├── orders.routes.ts         - POST criar pedido, GET meus pedidos
│   └── auth.routes.ts           - GET me, PUT profile
│
└── 👑 ADMIN (auth + role ADMIN)
    ├── products.routes.ts       - POST, PUT, DELETE gestão
    ├── orders.routes.ts         - GET all, PUT status
    ├── customers.routes.ts      - GET, DELETE gestão
    ├── sales-goals.routes.ts    - CRUD completo
    ├── notifications.routes.ts  - Gestão notificações
    ├── promotions.routes.ts     - POST, PUT, DELETE gestão
    ├── payments.routes.ts       - GET stats, refund
    ├── reviews.routes.ts        - GET all, PUT verify, DELETE
    └── digital-files.routes.ts  - POST, PUT, DELETE gestão
```

---

## 💡 **Benefícios da Separação**

1. **Segurança** - Controle claro de quem acessa o quê
2. **Manutenção** - Fácil identificar rotas públicas vs protegidas
3. **Documentação** - API clara para frontend consumir
4. **Escalabilidade** - Fácil adicionar novas funcionalidades
5. **Performance** - Evita checagens desnecessárias de auth em rotas públicas
