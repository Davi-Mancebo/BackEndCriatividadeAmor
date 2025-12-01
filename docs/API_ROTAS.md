# 📡 API - Documentação de Rotas

Guia completo de todas as rotas da API do BackEnd Criatividade & Amor.

**Base URL**: `http://localhost:3333/api`

---

## 🔐 Autenticação

Todas as rotas marcadas com 🔒 requerem autenticação via JWT Token no header:

```bash
Authorization: Bearer seu_token_aqui
```

Rotas marcadas com 👑 requerem privilégios de **Admin**.

---

## 📑 Índice

1. [Autenticação](#-autenticação-auth)
2. [Produtos](#-produtos-products)
3. [Imagens de Produtos](#-imagens-de-produtos-product-images)
4. [Pedidos](#-pedidos-orders)
5. [Pagamentos](#-pagamentos-payments)
6. [Notificações](#-notificações-notifications)
7. [Promoções](#-promoções-promotions)
8. [Compras](#-compras-purchases)
9. [Arquivos Digitais](#-arquivos-digitais-digital-files)

---

## 🔑 Autenticação (`/auth`)

### **POST** `/api/auth/login`
Login de usuário.

**Body:**
```json
{
  "email": "admin@criatividadeamor.com",
  "password": "senha123"
}
```

**Response 200:**
```json
{
  "user": {
    "id": "uuid",
    "name": "Admin",
    "email": "admin@criatividadeamor.com",
    "role": "ADMIN"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### **GET** `/api/auth/me` 🔒
Obter dados do usuário logado.

**Response 200:**
```json
{
  "id": "uuid",
  "name": "Admin",
  "email": "admin@criatividadeamor.com",
  "role": "ADMIN",
  "createdAt": "2025-11-01T10:00:00.000Z"
}
```

---

### **PUT** `/api/auth/profile` 🔒
Atualizar perfil do usuário.

**Body:**
```json
{
  "name": "Novo Nome",
  "email": "novoemail@example.com",
  "currentPassword": "senhaAtual123",
  "newPassword": "novaSenha456"
}
```

**Response 200:**
```json
{
  "message": "Perfil atualizado com sucesso",
  "user": {
    "id": "uuid",
    "name": "Novo Nome",
    "email": "novoemail@example.com"
  }
}
```

---

### **POST** `/api/auth/logout` 🔒
Logout (remove token no client-side).

**Response 200:**
```json
{
  "message": "Logout realizado com sucesso"
}
```

---

## 🎨 Produtos (`/products`)

### **GET** `/api/products` 🔒
Listar produtos com filtros e paginação.

**Query Params:**
- `page` (opcional): Página (default: 1)
- `limit` (opcional): Items por página (default: 20, max: 100)
- `category` (opcional): Filtrar por categoria
- `search` (opcional): Buscar por título/descrição
- `featured` (opcional): true/false - Produtos em destaque
- `active` (opcional): true/false - Produtos ativos
- `sortBy` (opcional): createdAt | price | sales | title
- `sortOrder` (opcional): asc | desc

**Exemplo:**
```bash
GET /api/products?page=1&limit=10&category=jogos&featured=true&sortBy=sales&sortOrder=desc
```

**Response 200:**
```json
{
  "products": [
    {
      "id": "uuid",
      "title": "Xadrez Magnético",
      "description": "Jogo de xadrez educativo...",
      "price": 49.90,
      "category": "jogos",
      "stock": 100,
      "featured": true,
      "active": true,
      "images": [
        {
          "id": "uuid",
          "url": "/uploads/products/uuid/file.png",
          "alt": "Xadrez - Imagem 1",
          "order": 0
        }
      ],
      "sales": 45,
      "createdAt": "2025-11-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

---

### **GET** `/api/products/:id` 🔒
Detalhes de um produto específico.

**Response 200:**
```json
{
  "id": "uuid",
  "title": "Xadrez Magnético",
  "description": "Descrição completa...",
  "price": 49.90,
  "category": "jogos",
  "stock": 100,
  "images": [...],
  "digitalFiles": [...],
  "promotions": [...],
  "createdAt": "2025-11-01T10:00:00.000Z"
}
```

---

### **POST** `/api/products` 🔒 👑
Criar novo produto.

**Body:**
```json
{
  "title": "Novo Produto",
  "description": "Descrição do produto",
  "price": 29.90,
  "stock": 50,
  "category": "educativo",
  "featured": false,
  "active": true
}
```

**Response 201:**
```json
{
  "id": "novo-uuid",
  "title": "Novo Produto",
  "price": 29.90,
  ...
}
```

---

### **PUT** `/api/products/:id` 🔒 👑
Atualizar produto.

**Body:**
```json
{
  "title": "Título Atualizado",
  "price": 39.90,
  "stock": 75
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "title": "Título Atualizado",
  "price": 39.90,
  ...
}
```

---

### **DELETE** `/api/products/:id` 🔒 👑
Soft delete (desativar produto).

**Response 200:**
```json
{
  "message": "Produto desativado com sucesso"
}
```

---

### **DELETE** `/api/products/:id/permanent` 🔒 👑
Hard delete (deletar permanentemente).

**Response 200:**
```json
{
  "message": "Produto deletado permanentemente"
}
```

---

## 🖼️ Imagens de Produtos (`/products/:productId/images`)

### **POST** `/api/products/:productId/images` 🔒 👑
Adicionar imagem ao produto (upload).

**Form-data:**
- `image` (file): Arquivo de imagem (JPEG/PNG/WebP, max 5MB)
- `alt` (string, opcional): Texto alternativo
- `order` (number, opcional): Ordem de exibição

**Response 201:**
```json
{
  "id": "uuid",
  "productId": "product-uuid",
  "url": "/uploads/products/product-uuid/file.png",
  "alt": "Produto - Imagem 1",
  "order": 0,
  "createdAt": "2025-11-30T10:00:00.000Z"
}
```

---

### **POST** `/api/products/:productId/images/bulk` 🔒 👑
Adicionar múltiplas imagens (máximo 10 por vez).

**Form-data:**
- `images[]` (files): Array de imagens

**Response 201:**
```json
{
  "message": "3 imagens adicionadas com sucesso",
  "images": [
    {
      "id": "uuid-1",
      "url": "/uploads/products/.../file1.png",
      "order": 0
    },
    {
      "id": "uuid-2",
      "url": "/uploads/products/.../file2.png",
      "order": 1
    }
  ]
}
```

---

### **GET** `/api/products/:productId/images` 🔒
Listar imagens de um produto.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "productId": "product-uuid",
    "url": "/uploads/products/product-uuid/file.png",
    "alt": "Produto - Imagem 1",
    "order": 0
  },
  ...
]
```

---

### **PUT** `/api/products/:productId/images/:imageId` 🔒 👑
Atualizar imagem (alt text ou ordem).

**Body:**
```json
{
  "alt": "Novo texto alternativo",
  "order": 2
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "alt": "Novo texto alternativo",
  "order": 2
}
```

---

### **DELETE** `/api/products/:productId/images/:imageId` 🔒 👑
Deletar imagem.

**Response 200:**
```json
{
  "message": "Imagem deletada com sucesso"
}
```

---

### **PUT** `/api/products/:productId/images/reorder` 🔒 👑
Reordenar imagens do produto.

**Body:**
```json
{
  "imageIds": ["uuid-2", "uuid-1", "uuid-3"]
}
```

**Response 200:**
```json
{
  "message": "Imagens reordenadas com sucesso"
}
```

---

## 📦 Pedidos (`/orders`)

### **GET** `/api/orders` 🔒 👑
Listar pedidos com filtros.

**Query Params:**
- `page` (opcional): Página
- `limit` (opcional): Items por página
- `status` (opcional): PENDING | PROCESSING | SHIPPED | DELIVERED | CANCELLED
- `search` (opcional): Buscar por nome/email
- `sortBy` (opcional): createdAt | total | customerName
- `sortOrder` (opcional): asc | desc

**Response 200:**
```json
{
  "orders": [
    {
      "id": "uuid",
      "orderNumber": "ORD-001",
      "customerName": "João Silva",
      "customerEmail": "joao@email.com",
      "total": 149.70,
      "status": "PROCESSING",
      "trackingCode": "BR123456789",
      "items": [
        {
          "productId": "uuid",
          "productTitle": "Xadrez Magnético",
          "quantity": 3,
          "price": 49.90
        }
      ],
      "createdAt": "2025-11-30T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20
  }
}
```

---

### **GET** `/api/orders/stats` 🔒 👑
Estatísticas do dashboard.

**Response 200:**
```json
{
  "totalOrders": 150,
  "totalRevenue": 15000.00,
  "pendingOrders": 10,
  "shippedOrders": 25,
  "averageOrderValue": 100.00,
  "topProducts": [
    {
      "productId": "uuid",
      "title": "Xadrez Magnético",
      "sales": 45,
      "revenue": 2245.50
    }
  ]
}
```

---

### **GET** `/api/orders/:id` 🔒 👑
Detalhes de um pedido específico.

**Response 200:**
```json
{
  "id": "uuid",
  "orderNumber": "ORD-001",
  "customerName": "João Silva",
  "customerEmail": "joao@email.com",
  "total": 149.70,
  "status": "PROCESSING",
  "trackingCode": "BR123456789",
  "notes": "Entregar no período da manhã",
  "items": [...],
  "payment": {
    "status": "APPROVED",
    "method": "CREDIT_CARD",
    "amount": 149.70
  },
  "createdAt": "2025-11-30T10:00:00.000Z"
}
```

---

### **PUT** `/api/orders/:id` 🔒 👑
Atualizar pedido (status, tracking, notas).

**Body:**
```json
{
  "status": "SHIPPED",
  "trackingCode": "BR987654321",
  "notes": "Enviado via Correios"
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "status": "SHIPPED",
  "trackingCode": "BR987654321"
}
```

---

### **POST** `/api/orders` 🔒 👑
Criar novo pedido manualmente.

**Body:**
```json
{
  "customerName": "Maria Santos",
  "customerEmail": "maria@email.com",
  "items": [
    {
      "productId": "uuid",
      "quantity": 2,
      "price": 49.90
    }
  ],
  "total": 99.80
}
```

**Response 201:**
```json
{
  "id": "novo-uuid",
  "orderNumber": "ORD-151",
  "customerName": "Maria Santos",
  "total": 99.80,
  "status": "PENDING"
}
```

---

## 💳 Pagamentos (`/payments`)

### **POST** `/api/payments/create` ⚡ (Público)
Criar pagamento via Mercado Pago.

**Body:**
```json
{
  "orderId": "order-uuid",
  "payerEmail": "cliente@email.com",
  "payerName": "João Silva",
  "payerDocument": "12345678900"
}
```

**Response 200:**
```json
{
  "payment": {
    "id": "payment-uuid",
    "status": "PENDING",
    "amount": 149.70
  },
  "initPoint": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=xxx"
}
```

---

### **POST** `/api/payments/webhook` ⚡ (Público)
Webhook do Mercado Pago (chamado automaticamente).

**Body (Mercado Pago):**
```json
{
  "type": "payment",
  "data": {
    "id": "123456789"
  }
}
```

**Response 200:**
```json
{
  "message": "Webhook processado"
}
```

---

### **GET** `/api/payments/status/:orderId` ⚡ (Público)
Verificar status do pagamento de um pedido.

**Response 200:**
```json
{
  "payment": {
    "id": "uuid",
    "status": "APPROVED",
    "amount": 149.70,
    "method": "PIX"
  },
  "order": {
    "id": "uuid",
    "orderNumber": "ORD-001",
    "status": "PAID"
  }
}
```

---

### **GET** `/api/payments` 🔒 👑
Listar pagamentos (admin).

**Query Params:**
- `status` (opcional): PENDING | APPROVED | REJECTED | REFUNDED
- `method` (opcional): CREDIT_CARD | PIX | BOLETO

**Response 200:**
```json
{
  "payments": [
    {
      "id": "uuid",
      "orderId": "order-uuid",
      "amount": 149.70,
      "status": "APPROVED",
      "method": "PIX",
      "payerEmail": "cliente@email.com",
      "approvedAt": "2025-11-30T10:05:00.000Z",
      "createdAt": "2025-11-30T10:00:00.000Z"
    }
  ]
}
```

---

### **GET** `/api/payments/:id` 🔒 👑
Detalhes de um pagamento.

**Response 200:**
```json
{
  "id": "uuid",
  "orderId": "order-uuid",
  "amount": 149.70,
  "status": "APPROVED",
  "method": "PIX",
  "mercadoPagoId": "123456789",
  "payerEmail": "cliente@email.com",
  "payerName": "João Silva",
  "installments": 1,
  "webhookData": {...},
  "approvedAt": "2025-11-30T10:05:00.000Z"
}
```

---

### **POST** `/api/payments/:id/refund` 🔒 👑
Solicitar reembolso.

**Body:**
```json
{
  "reason": "Cliente solicitou cancelamento"
}
```

**Response 200:**
```json
{
  "message": "Reembolso solicitado com sucesso",
  "payment": {
    "id": "uuid",
    "status": "REFUNDED"
  }
}
```

---

### **GET** `/api/payments/stats/overview` 🔒 👑
Estatísticas de pagamentos.

**Response 200:**
```json
{
  "totalReceived": 15000.00,
  "approvedPayments": 145,
  "pendingPayments": 5,
  "rejectedPayments": 3,
  "refundedPayments": 2,
  "paymentsByMethod": {
    "PIX": 80,
    "CREDIT_CARD": 60,
    "BOLETO": 5
  }
}
```

---

## 🔔 Notificações (`/notifications`)

### **GET** `/api/notifications` 🔒
Listar notificações do usuário.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "userId": "user-uuid",
    "title": "Novo Pedido #ORD-001",
    "message": "Pedido de R$ 149,70 recebido",
    "type": "NEW_ORDER",
    "read": false,
    "createdAt": "2025-11-30T10:00:00.000Z"
  }
]
```

---

### **PUT** `/api/notifications/:id/read` 🔒
Marcar notificação como lida.

**Response 200:**
```json
{
  "message": "Notificação marcada como lida"
}
```

---

### **PUT** `/api/notifications/read-all` 🔒
Marcar todas as notificações como lidas.

**Response 200:**
```json
{
  "message": "Todas as notificações foram marcadas como lidas",
  "count": 15
}
```

---

### **DELETE** `/api/notifications/:id` 🔒
Deletar notificação.

**Response 200:**
```json
{
  "message": "Notificação deletada"
}
```

---

## 🎁 Promoções (`/promotions`)

### **POST** `/api/promotions` 🔒 👑
Criar promoção.

**Body:**
```json
{
  "productId": "product-uuid",
  "name": "Black Friday 2025",
  "startDate": "2025-11-25T00:00:00.000Z",
  "endDate": "2025-11-30T23:59:59.000Z",
  "discountPercent": 30,
  "discountAmount": null,
  "active": true
}
```

**Response 201:**
```json
{
  "id": "promo-uuid",
  "productId": "product-uuid",
  "name": "Black Friday 2025",
  "discountPercent": 30,
  "active": true
}
```

---

### **GET** `/api/promotions` 🔒
Listar todas as promoções.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "productId": "product-uuid",
    "name": "Black Friday 2025",
    "discountPercent": 30,
    "startDate": "2025-11-25T00:00:00.000Z",
    "endDate": "2025-11-30T23:59:59.000Z",
    "active": true
  }
]
```

---

### **GET** `/api/promotions/:id` 🔒
Detalhes de uma promoção.

**Response 200:**
```json
{
  "id": "uuid",
  "productId": "product-uuid",
  "product": {
    "title": "Xadrez Magnético",
    "price": 49.90
  },
  "name": "Black Friday 2025",
  "discountPercent": 30,
  "finalPrice": 34.93,
  "active": true
}
```

---

### **PUT** `/api/promotions/:id` 🔒 👑
Atualizar promoção.

**Body:**
```json
{
  "name": "Super Desconto",
  "discountPercent": 50,
  "active": false
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "name": "Super Desconto",
  "discountPercent": 50,
  "active": false
}
```

---

### **DELETE** `/api/promotions/:id` 🔒 👑
Deletar promoção.

**Response 200:**
```json
{
  "message": "Promoção deletada com sucesso"
}
```

---

### **GET** `/api/promotions/product/:productId/active` 🔒
Buscar promoção ativa de um produto.

**Response 200:**
```json
{
  "id": "uuid",
  "name": "Black Friday 2025",
  "discountPercent": 30,
  "finalPrice": 34.93
}
```

---

## 🛒 Compras (`/purchases`)

### **GET** `/api/purchases/my-products` ⚡ (Público)
Listar produtos comprados pelo email.

**Query Params:**
- `email` (obrigatório): Email do cliente

**Exemplo:**
```bash
GET /api/purchases/my-products?email=cliente@email.com
```

**Response 200:**
```json
{
  "email": "cliente@email.com",
  "purchases": [
    {
      "orderId": "order-uuid",
      "orderNumber": "ORD-001",
      "productId": "product-uuid",
      "productTitle": "Ebook - Atividades Infantis",
      "price": 19.90,
      "purchasedAt": "2025-11-30T10:00:00.000Z",
      "hasDigitalFiles": true
    }
  ]
}
```

---

### **GET** `/api/purchases/verify` ⚡ (Público)
Verificar se email comprou produto específico.

**Query Params:**
- `email` (obrigatório): Email do cliente
- `productId` (obrigatório): UUID do produto

**Exemplo:**
```bash
GET /api/purchases/verify?email=cliente@email.com&productId=product-uuid
```

**Response 200:**
```json
{
  "hasPurchased": true,
  "purchase": {
    "orderId": "order-uuid",
    "orderNumber": "ORD-001",
    "purchasedAt": "2025-11-30T10:00:00.000Z"
  }
}
```

---

## 📥 Arquivos Digitais (`/digital-files`)

### **GET** `/api/digital-files/download/:productId` ⚡ (Público)
Baixar arquivos digitais (se comprou).

**Query Params:**
- `email` (obrigatório): Email do cliente

**Exemplo:**
```bash
GET /api/digital-files/download/product-uuid?email=cliente@email.com
```

**Response 200:**
```
Content-Type: application/zip
Content-Disposition: attachment; filename="Produto-Files.zip"

[Binary file data]
```

**Response 403 (se não comprou):**
```json
{
  "error": "Você não comprou este produto"
}
```

---

### **GET** `/api/digital-files/check/:productId` ⚡ (Público)
Verificar se tem acesso aos arquivos.

**Query Params:**
- `email` (obrigatório): Email do cliente

**Response 200:**
```json
{
  "hasAccess": true,
  "fileCount": 3,
  "totalSize": "15.2 MB"
}
```

---

### **POST** `/api/digital-files/:productId` 🔒 👑
Adicionar arquivo digital ao produto.

**Form-data:**
- `file` (file): Arquivo (PDF, ZIP, etc., max 50MB)
- `name` (string): Nome do arquivo
- `description` (string, opcional): Descrição

**Response 201:**
```json
{
  "id": "file-uuid",
  "productId": "product-uuid",
  "name": "Atividades.pdf",
  "filePath": "/uploads/digital-files/product-uuid/file.pdf",
  "fileSize": 2048576,
  "mimeType": "application/pdf",
  "createdAt": "2025-11-30T10:00:00.000Z"
}
```

---

### **GET** `/api/digital-files/:productId` 🔒 👑
Listar arquivos digitais de um produto.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "productId": "product-uuid",
    "name": "Atividades.pdf",
    "description": "PDF com 50 atividades",
    "filePath": "/uploads/digital-files/.../file.pdf",
    "fileSize": 2048576,
    "mimeType": "application/pdf",
    "downloads": 45,
    "createdAt": "2025-11-30T10:00:00.000Z"
  }
]
```

---

### **PUT** `/api/digital-files/:fileId` 🔒 👑
Atualizar arquivo digital (metadados).

**Body:**
```json
{
  "name": "Novo Nome.pdf",
  "description": "Descrição atualizada"
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "name": "Novo Nome.pdf",
  "description": "Descrição atualizada"
}
```

---

### **DELETE** `/api/digital-files/:fileId` 🔒 👑
Deletar arquivo digital.

**Response 200:**
```json
{
  "message": "Arquivo deletado com sucesso"
}
```

---

### **GET** `/api/digital-files/stats/overview` 🔒 👑
Estatísticas de downloads.

**Response 200:**
```json
{
  "totalFiles": 25,
  "totalDownloads": 450,
  "totalSize": "256 MB",
  "topDownloaded": [
    {
      "fileId": "uuid",
      "name": "Atividades.pdf",
      "downloads": 120
    }
  ]
}
```

---

## 📊 Códigos de Status HTTP

| Código | Significado |
|--------|-------------|
| `200` | Sucesso |
| `201` | Criado com sucesso |
| `400` | Requisição inválida (validação) |
| `401` | Não autenticado (token inválido) |
| `403` | Sem permissão (não é admin ou não comprou) |
| `404` | Recurso não encontrado |
| `500` | Erro interno do servidor |

---

## 🔧 Exemplos de Uso

### **JavaScript/Fetch**

```javascript
// Login
const response = await fetch('http://localhost:3333/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@criatividadeamor.com',
    password: 'senha123'
  })
});

const { token, user } = await response.json();

// Buscar produtos (autenticado)
const products = await fetch('http://localhost:3333/api/products?featured=true', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await products.json();
console.log(data.products);
```

---

### **cURL**

```bash
# Login
curl -X POST http://localhost:3333/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@criatividadeamor.com","password":"senha123"}'

# Listar produtos (com token)
curl http://localhost:3333/api/products \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Upload de imagem
curl -X POST http://localhost:3333/api/products/PRODUCT_UUID/images \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -F "image=@/path/to/image.png" \
  -F "alt=Imagem do produto"
```

---

### **Axios (React)**

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3333/api',
});

// Interceptor para adicionar token automaticamente
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Usar
const { data } = await api.get('/products');
console.log(data.products);
```

---

## 🚀 Próximos Passos

1. Implementar rate limiting nas rotas públicas
2. Adicionar cache para produtos e imagens
3. Criar webhook para notificar cliente via email
4. Implementar busca full-text com Elasticsearch
5. Adicionar suporte a múltiplos idiomas

---

## 📞 Suporte

Para dúvidas ou problemas:
- **Email**: suporte@criatividadeamor.com
- **GitHub**: [repositório do projeto]

---

**Última atualização**: 30/11/2025
