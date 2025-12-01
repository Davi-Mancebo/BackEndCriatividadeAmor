# 🚀 Como o Projeto Está Funcionando

**Data:** 30 de Novembro de 2025  
**Status:** ✅ Backend completo com arquitetura Service/Controller/Route

---

## 📋 Visão Geral

O projeto é uma **API REST** para e-commerce de produtos digitais (PDFs para download) usando:
- **Node.js + Express + TypeScript**
- **PostgreSQL** (via Prisma ORM)
- **JWT** para autenticação (stateless, sem sessões)
- **Multer** para upload de imagens
- **Cloudinary** (opcional) ou armazenamento local

---

## 🔐 Sistema de Autenticação (Login)

### **Como Funciona o Login:**

1. **POST /api/auth/login** - Cliente envia `{ email, password }`

2. **Validação** (`auth.routes.ts`):
   ```typescript
   validate([
     body('email').isEmail(),
     body('password').notEmpty()
   ])
   ```

3. **Processamento** (`auth.service.ts`):
   ```typescript
   async login(data: LoginData) {
     // 1. Busca usuário no banco pelo email
     const user = await prisma.user.findUnique({ where: { email } });
     
     // 2. Compara senha usando bcrypt
     const validPassword = await bcrypt.compare(password, user.password);
     
     // 3. Gera token JWT com userId
     const token = jwt.sign({ userId: user.id }, JWT_SECRET);
     
     // 4. Retorna usuário (sem senha) + token
     return { user: userWithoutPassword, token };
   }
   ```

4. **Resposta:**
   ```json
   {
     "user": {
       "id": "uuid",
       "name": "Administrador",
       "email": "admin@criatividade.com",
       "role": "SUPER_ADMIN",
       "createdAt": "2025-11-30T..."
     },
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   }
   ```

### **Como Funciona a Proteção de Rotas:**

1. **Cliente envia token no header:**
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **Middleware valida** (`auth.middleware.ts`):
   ```typescript
   export const authMiddleware = async (req, res, next) => {
     // 1. Extrai token do header
     const [, token] = req.headers.authorization.split(' ');
     
     // 2. Verifica assinatura JWT
     const decoded = jwt.verify(token, JWT_SECRET);
     
     // 3. Busca usuário no banco (garante que ainda existe)
     const user = await prisma.user.findUnique({ 
       where: { id: decoded.userId } 
     });
     
     // 4. Adiciona userId ao request
     req.userId = decoded.userId;
     next();
   }
   ```

3. **Controllers usam `req.userId`:**
   ```typescript
   async getById(req: AuthRequest, res: Response) {
     const order = await ordersService.getById(req.params.id);
     // req.userId está disponível para validações
   }
   ```

### **Segurança:**

✅ **Senha hashada** com bcrypt (10 rounds de salt)  
✅ **Token JWT stateless** (sem armazenamento no servidor)  
✅ **Validade:** 7 dias (configurável em JWT_EXPIRES_IN)  
✅ **Verificação em cada request** - usuário pode ser deletado e token invalida  
✅ **Middleware de Admin** - valida role ADMIN/SUPER_ADMIN

---

## 📸 Sistema de Imagens

### **Como as Imagens São Salvas:**

O projeto suporta **2 modos** de armazenamento:

#### **1. Modo LOCAL (Padrão - Se Cloudinary não configurado):**

```typescript
// upload.middleware.ts
const storage = multer.diskStorage({
  destination: 'uploads/',  // Pasta local
  filename: Date.now() + '-' + Math.random() + '.jpg'
});
```

**Fluxo:**
1. Cliente envia imagem via `FormData` (multipart/form-data)
2. Multer salva em `uploads/` com nome único: `1701369600000-123456789.jpg`
3. URL retornada: `/uploads/1701369600000-123456789.jpg`
4. Servidor serve arquivos via: `app.use('/uploads', express.static('uploads'))`

**Acesso:** `http://localhost:3333/uploads/1701369600000-123456789.jpg`

**Características:**
- ✅ Rápido e simples
- ✅ Sem custo
- ❌ Arquivos ficam no servidor (não escala em múltiplos servidores)
- ❌ Backup manual necessário

---

#### **2. Modo CLOUDINARY (Se configurado no .env):**

```typescript
// product-images.service.ts
if (process.env.CLOUDINARY_CLOUD_NAME) {
  // Upload para Cloudinary
  imageUrl = await uploadToCloudinary(file.path, 'products');
  // Deleta arquivo local temporário
  await fs.unlink(file.path);
} else {
  // Modo local
  imageUrl = `/uploads/${file.filename}`;
}
```

**Fluxo:**
1. Multer salva temporariamente em `uploads/`
2. Cloudinary faz upload e retorna URL CDN
3. Arquivo local é deletado
4. URL retornada: `https://res.cloudinary.com/...`

**Características:**
- ✅ CDN global (carregamento rápido)
- ✅ Transformações automáticas (resize, compress, webp)
- ✅ Backup automático na nuvem
- ❌ Custo após limite gratuito (25 GB/mês grátis)

**Transformações aplicadas:**
```typescript
transformation: [
  { width: 800, height: 800, crop: 'limit' },  // Máx 800x800
  { quality: 'auto' },                         // Compressão inteligente
  { fetch_format: 'auto' }                     // WebP para navegadores compatíveis
]
```

---

### **Endpoints de Imagens:**

```typescript
// POST /api/products/:productId/images - Upload
router.post('/:productId/images', 
  upload.single('image'),  // Multer middleware
  validate([...]),
  productImagesController.create
);

// GET /api/products/:productId/images - Listar
// PUT /api/products/:productId/images/:imageId - Atualizar ordem/alt
// DELETE /api/products/:productId/images/:imageId - Deletar
// PUT /api/products/:productId/images/reorder - Reordenar múltiplas
```

**Validações:**
- ✅ Tamanho máximo: **5 MB**
- ✅ Formatos permitidos: **JPEG, JPG, PNG, WebP**
- ✅ Ordem de exibição (0 = imagem principal)

---

## 📊 Banco de Dados (PostgreSQL)

### **Conexão:**

```env
DATABASE_URL="postgresql://postgres:admin@localhost:5432/criatividade_amor?schema=public"
```

- **USER:** postgres (padrão do PostgreSQL)
- **PASSWORD:** admin (definida no PgAdmin)
- **HOST:** localhost
- **PORT:** 5432 (padrão)
- **DATABASE:** criatividade_amor (criado automaticamente pelo Prisma)

### **Modelos Principais:**

```prisma
User (Administradores)
├── id, name, email, password (hash bcrypt)
├── role: ADMIN | SUPER_ADMIN
└── notifications[]

Product (Produtos - Físicos ou Digitais)
├── title, description, price, stock
├── type: PHYSICAL | DIGITAL | SERVICE
├── condition: NEW | USED | REFURBISHED
├── featured, active, sales
├── images[] (ProductImage)
├── promotions[] (Promotion)
└── digitalFiles[] (DigitalFile)

ProductImage (Imagens dos Produtos)
├── productId → Product
├── url (local ou Cloudinary)
├── alt (SEO)
└── order (0 = principal)

Order (Pedidos)
├── orderNumber (CUID único)
├── customerName, customerEmail, customerPhone
├── items (JSON array)
├── status: PENDING | PROCESSING | SHIPPED | DELIVERED | CANCELLED
├── payment → Payment
└── shippingAddress (JSON)

Payment (Pagamentos - Mercado Pago)
├── orderId → Order
├── amount, method, status
├── mercadoPagoId, preferenceId
├── payerEmail, installments
└── webhookData (JSON)

DigitalFile (Arquivos para Download)
├── productId → Product
├── name, description, fileUrl
├── fileType, fileSize
└── downloadCount

PurchaseHistory (Histórico de Compras)
├── orderId → Order
├── customerEmail, productId
└── pricePaid, purchasedAt

Promotion (Promoções)
├── productId → Product
├── name, discountPercent | discountAmount
└── startDate, endDate, active

Notification (Notificações do Admin)
├── userId → User
├── type: NEW_ORDER | ORDER_UPDATE | LOW_STOCK | SYSTEM
└── read, title, message, data (JSON)
```

---

## 🏗️ Arquitetura (Service/Controller/Route)

### **Fluxo de uma Request:**

```
Cliente HTTP Request
      ↓
Express Server (server.ts)
      ↓
Routes (auth.routes.ts)
├── Validação (express-validator)
├── Middleware (authMiddleware)
└── Controller (authController.login)
      ↓
Controller (auth.controller.ts)
├── Extrai dados do req.body
├── Chama Service
└── Retorna res.json()
      ↓
Service (auth.service.ts)
├── Lógica de negócio pura
├── Acessa banco (Prisma)
├── Validações (throw AppError)
└── Retorna dados
      ↓
Response JSON ao Cliente
```

### **Exemplo Completo (Login):**

**1. Route** (`auth.routes.ts`):
```typescript
router.post('/login',
  validate([
    body('email').isEmail(),
    body('password').notEmpty()
  ]),
  authController.login  // Apenas chama o controller
);
```

**2. Controller** (`auth.controller.ts`):
```typescript
async login(req: AuthRequest, res: Response) {
  const { email, password } = req.body;  // Extrai dados HTTP
  const result = await authService.login({ email, password });  // Chama service
  res.json(result);  // Retorna HTTP
}
```

**3. Service** (`auth.service.ts`):
```typescript
async login(data: LoginData) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('Credenciais inválidas', 401);
  
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) throw new AppError('Credenciais inválidas', 401);
  
  const token = jwt.sign({ userId: user.id }, JWT_SECRET);
  return { user: userWithoutPassword, token };
}
```

---

## 📁 Estrutura de Pastas

```
src/
├── controllers/         (9 arquivos) - HTTP handlers
│   ├── auth.controller.ts
│   ├── orders.controller.ts
│   ├── products.controller.ts
│   ├── notifications.controller.ts
│   ├── product-images.controller.ts
│   ├── promotions.controller.ts
│   ├── digital-file.controller.ts
│   ├── payment.controller.ts
│   └── purchase.controller.ts
│
├── services/           (10 arquivos) - Lógica de negócio
│   ├── auth.service.ts
│   ├── orders.service.ts
│   ├── products.service.ts
│   ├── notifications.service.ts
│   ├── product-images.service.ts
│   ├── promotions.service.ts
│   ├── digital-file.service.ts
│   ├── payment.service.ts
│   ├── purchase.service.ts
│   └── mercadopago.service.ts
│
├── routes/             (11 arquivos) - Definição de endpoints
│   ├── index.ts                    ← Exportação centralizada
│   ├── auth.routes.ts
│   ├── orders.routes.ts
│   ├── products.routes.ts
│   ├── notifications.routes.ts
│   ├── product-images.routes.ts
│   ├── promotions.routes.ts
│   ├── digital-files.routes.ts
│   ├── payments.routes.ts
│   └── purchases.routes.ts
│
├── middlewares/        (3 arquivos)
│   ├── auth.middleware.ts          ← JWT validation
│   ├── error.middleware.ts         ← Error handler
│   └── upload.middleware.ts        ← Multer config
│
├── utils/              (2 arquivos)
│   ├── cloudinary.ts               ← Upload/delete Cloudinary
│   └── validate.ts                 ← Express validator helper
│
├── lib/
│   └── prisma.ts                   ← Prisma client singleton
│
├── prisma/
│   └── seed.ts                     ← Dados iniciais
│
└── server.ts                       ← Aplicação Express
```

---

## 🌐 Endpoints Disponíveis

### **Autenticação:**
```
POST   /api/auth/login         - Login (retorna token)
GET    /api/auth/me            - Dados do usuário logado
PUT    /api/auth/profile       - Atualizar perfil
POST   /api/auth/logout        - Logout (simbólico)
```

### **Produtos:**
```
GET    /api/products           - Listar (filtros, paginação)
GET    /api/products/:id       - Detalhes
POST   /api/products           - Criar
PUT    /api/products/:id       - Atualizar
DELETE /api/products/:id       - Desativar (soft delete)
DELETE /api/products/:id/permanent - Deletar permanentemente
```

### **Imagens de Produtos:**
```
POST   /api/products/:productId/images        - Upload imagem
GET    /api/products/:productId/images        - Listar imagens
PUT    /api/products/:productId/images/:id    - Atualizar
DELETE /api/products/:productId/images/:id    - Deletar
PUT    /api/products/:productId/images/reorder - Reordenar
```

### **Pedidos:**
```
GET    /api/orders             - Listar pedidos
GET    /api/orders/stats       - Estatísticas do dashboard
GET    /api/orders/:id         - Detalhes do pedido
POST   /api/orders             - Criar pedido
PUT    /api/orders/:id         - Atualizar status/tracking
```

### **Promoções:**
```
GET    /api/promotions                      - Listar promoções
GET    /api/promotions/:id                  - Detalhes
POST   /api/promotions                      - Criar
PUT    /api/promotions/:id                  - Atualizar
DELETE /api/promotions/:id                  - Deletar
GET    /api/promotions/product/:id/active   - Promoção ativa
```

### **Notificações:**
```
GET    /api/notifications              - Listar
PUT    /api/notifications/:id/read     - Marcar como lida
PUT    /api/notifications/read-all     - Marcar todas
DELETE /api/notifications/:id          - Deletar
```

### **Pagamentos (Mercado Pago):**
```
POST   /api/payments                   - Criar pagamento
POST   /api/payments/webhook           - Webhook do MP
GET    /api/payments/status/:id        - Status do pagamento
GET    /api/payments                   - Listar (admin)
POST   /api/payments/:id/refund        - Reembolso (admin)
GET    /api/payments/stats             - Estatísticas (admin)
```

### **Arquivos Digitais:**
```
GET    /api/digital-files/:id/download       - Download (com validação de compra)
GET    /api/digital-files/check-access/:id   - Verificar acesso
POST   /api/digital-files                    - Criar (admin)
GET    /api/digital-files                    - Listar (admin)
PUT    /api/digital-files/:id                - Atualizar (admin)
DELETE /api/digital-files/:id                - Deletar (admin)
GET    /api/digital-files/stats              - Estatísticas (admin)
```

### **Compras (Cliente):**
```
GET    /api/purchases/my-products       - Produtos comprados (por email)
GET    /api/purchases/verify/:orderId   - Verificar compra
```

---

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
npm run dev                  # Inicia servidor (tsx watch)

# Banco de Dados
npx prisma migrate dev      # Criar/aplicar migrations
npx prisma generate         # Gerar tipos TypeScript
npx prisma studio           # Interface visual do banco
npm run seed                # Popular banco com dados iniciais

# Build (Produção)
npm run build               # Compilar TypeScript
npm start                   # Rodar versão compilada
```

---

## 📦 Dados Iniciais (Seed)

Ao executar `npm run seed`, será criado:

✅ **1 Usuário Admin:**
- Email: `admin@criatividade.com`
- Senha: `admin123`
- Role: `SUPER_ADMIN`

✅ **3 Produtos de exemplo:**
- Colar Artesanal Floral (R$ 89,90)
- Brincos de Resina (R$ 45,00)
- Pulseira Macramê (R$ 35,00)

✅ **2 Pedidos de exemplo:**
- Maria Silva (Em processamento)
- João Santos (Pendente)

✅ **1 Notificação de teste**

---

## 🚦 Como Testar

### **1. Configurar ambiente:**
```bash
# Criar .env (já criado)
# Ajustar DATABASE_URL se necessário
```

### **2. Configurar banco:**
```bash
npx prisma migrate dev --name init
npx prisma generate
npm run seed
```

### **3. Iniciar servidor:**
```bash
npm run dev
# Servidor em: http://localhost:3333
```

### **4. Testar login:**
```bash
# POST http://localhost:3333/api/auth/login
{
  "email": "admin@criatividade.com",
  "password": "admin123"
}

# Resposta: { user: {...}, token: "..." }
```

### **5. Testar rotas protegidas:**
```bash
# GET http://localhost:3333/api/auth/me
# Header: Authorization: Bearer SEU_TOKEN_AQUI
```

### **6. Testar upload de imagem:**
```bash
# POST http://localhost:3333/api/products/[PRODUCT_ID]/images
# Content-Type: multipart/form-data
# Body: image (arquivo) + alt (texto) + order (número)
# Header: Authorization: Bearer SEU_TOKEN_AQUI
```

---

## ⚠️ Importante

**Mercado Pago:**
- SDK ainda não instalado: `npm install mercadopago`
- Credenciais vazias no `.env` (preencher quando tiver conta)
- Use credenciais de TESTE primeiro (começam com `TEST-`)

**Upload de Imagens:**
- **Modo LOCAL ativo** (Cloudinary não configurado)
- Imagens salvas em `uploads/`
- Acessíveis via `http://localhost:3333/uploads/[filename]`
- Para usar Cloudinary: configurar variáveis no `.env`

**Segurança:**
- Trocar `JWT_SECRET` em produção
- Nunca commitar `.env`
- Validar CORS em produção
