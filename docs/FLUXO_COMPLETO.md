# 🎯 Fluxo Completo do Sistema

## 👥 Tipos de Usuário

### **1. ADMIN / SUPER_ADMIN**
- Acessa painel administrativo
- Gerencia produtos, pedidos, pagamentos
- Upload de arquivos digitais
- Visualiza estatísticas

### **2. CLIENTE (Não logado)**
- Navega na loja
- Compra produtos
- Acessa downloads após pagamento
- Não precisa criar conta

---

## 🛍️ Jornada do Cliente

### **Passo 1: Navegar na Loja**

```http
GET /api/products
GET /api/products?type=DIGITAL
GET /api/products/:id
```

**Resposta:**
```json
{
  "id": "uuid",
  "title": "Jogo da Velha Interativo - Base para Impressão",
  "description": "Arquivo PDF pronto para imprimir e recortar",
  "price": 15.90,
  "type": "DIGITAL",
  "images": [
    {
      "url": "https://...",
      "order": 0
    }
  ],
  "digitalFiles": [] // Escondido até comprar
}
```

---

### **Passo 2: Adicionar ao Carrinho (Frontend)**

O carrinho fica no **localStorage** ou **estado React**:

```javascript
const cart = [
  {
    productId: "uuid-1",
    title: "Jogo da Velha",
    price: 15.90,
    quantity: 1,
    image: "https://..."
  },
  {
    productId: "uuid-2", 
    title: "Quebra-Cabeça",
    price: 12.50,
    quantity: 1,
    image: "https://..."
  }
]
```

---

### **Passo 3: Finalizar Compra**

```http
POST /api/orders
{
  "customerName": "Maria Silva",
  "customerEmail": "maria@email.com",
  "customerPhone": "11999999999",
  "items": [
    {
      "productId": "uuid-1",
      "title": "Jogo da Velha",
      "price": 15.90,
      "quantity": 1,
      "image": "https://..."
    }
  ],
  "subtotal": 15.90,
  "shipping": 0, // Digital não tem frete
  "total": 15.90
}
```

**Resposta:**
```json
{
  "order": {
    "id": "order-uuid",
    "orderNumber": "ORD-20241130-ABC123",
    "customerEmail": "maria@email.com",
    "total": 15.90,
    "status": "PENDING"
  }
}
```

---

### **Passo 4: Criar Pagamento**

```http
POST /api/payments/create
{
  "orderId": "order-uuid",
  "payerEmail": "maria@email.com",
  "payerName": "Maria Silva",
  "payerDocument": "12345678900"
}
```

**Resposta:**
```json
{
  "payment": {
    "id": "payment-uuid",
    "status": "PENDING",
    "amount": 15.90
  },
  "initPoint": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=xxx",
  "message": "Redirecione o cliente para initPoint"
}
```

---

### **Passo 5: Cliente Paga no Mercado Pago**

**Frontend redireciona:**
```javascript
window.location.href = initPoint;
// OU em modal/iframe
```

Cliente escolhe:
- 💳 Cartão de Crédito
- 🏦 PIX
- 📄 Boleto

---

### **Passo 6: Mercado Pago Notifica Backend (Webhook)**

```http
POST /api/payments/webhook
{
  "type": "payment",
  "data": {
    "id": "123456789" // ID no Mercado Pago
  }
}
```

**Backend automaticamente:**
1. ✅ Atualiza `Payment.status = APPROVED`
2. ✅ Atualiza `Order.status = PAID`
3. ✅ Cria `PurchaseHistory` para cada item
4. ✅ Cliente agora tem acesso aos downloads!

---

### **Passo 7: Cliente é Redirecionado**

Mercado Pago redireciona para:
```
https://seusite.com/payment/success?payment_id=123&status=approved
```

**Frontend:**
```javascript
// Página de sucesso
const params = new URLSearchParams(window.location.search);
const orderId = params.get('orderId');

// Buscar produtos comprados
fetch(`/api/purchases/my-products?email=${email}`)
  .then(res => res.json())
  .then(data => {
    // Mostrar lista de produtos com botões de download
  });
```

---

### **Passo 8: Acessar Downloads**

**Cliente acessa página "Meus Produtos":**

```http
GET /api/purchases/my-products?email=maria@email.com
```

**Resposta:**
```json
{
  "email": "maria@email.com",
  "purchases": [
    {
      "id": "purchase-uuid",
      "orderId": "order-uuid",
      "productId": "product-uuid",
      "productTitle": "Jogo da Velha Interativo",
      "pricePaid": 15.90,
      "purchasedAt": "2024-11-30T10:30:00Z",
      "product": {
        "id": "product-uuid",
        "title": "Jogo da Velha Interativo",
        "type": "DIGITAL",
        "images": [...],
        "digitalFiles": [
          {
            "id": "file-uuid",
            "name": "Jogo da Velha - Base.pdf",
            "description": "Arquivo para impressão",
            "fileSize": 2048576,
            "fileType": "application/pdf"
          }
        ]
      }
    }
  ],
  "totalPurchases": 1
}
```

---

### **Passo 9: Baixar Arquivo**

```http
GET /api/digital-files/download/product-uuid?email=maria@email.com
```

**Validações do backend:**
1. ✅ Produto existe e é digital?
2. ✅ Email comprou este produto? (verifica `PurchaseHistory`)
3. ✅ Se SIM: retorna URLs de download
4. ❌ Se NÃO: erro 403

**Resposta (se comprou):**
```json
{
  "product": {
    "id": "product-uuid",
    "title": "Jogo da Velha Interativo"
  },
  "purchase": {
    "orderId": "order-uuid",
    "purchasedAt": "2024-11-30T10:30:00Z"
  },
  "files": [
    {
      "id": "file-uuid",
      "name": "Jogo da Velha - Base.pdf",
      "downloadUrl": "https://cloudinary.com/...secured-url",
      "fileSize": 2048576,
      "fileType": "application/pdf"
    }
  ],
  "message": "Clique no link para baixar"
}
```

**Frontend:**
```javascript
// Botão de download
<a href={file.downloadUrl} download target="_blank">
  📥 Baixar {file.name}
</a>
```

---

## 🔧 Fluxo do Admin

### **1. Criar Produto Digital**

```http
POST /api/products
{
  "title": "Jogo da Velha Interativo",
  "description": "Base para imprimir e recortar",
  "price": 15.90,
  "type": "DIGITAL",
  "category": "Jogos Educativos",
  "stock": 999, // Digital sempre disponível
  "featured": true,
  "active": true
}
```

---

### **2. Upload de Imagem do Produto**

```http
POST /api/products/{productId}/images
Content-Type: multipart/form-data

{
  file: [imagem.jpg],
  alt: "Jogo da Velha - Preview"
}
```

---

### **3. Upload do Arquivo Digital (PDF)**

```http
POST /api/digital-files/{productId}
Content-Type: multipart/form-data

{
  file: [jogo-da-velha-base.pdf],
  name: "Jogo da Velha - Base para Impressão",
  description: "Arquivo em PDF, pronto para imprimir em A4"
}
```

**Backend salva:**
- Arquivo no Cloudinary (ou S3)
- Registro no banco com `fileUrl`

---

### **4. Listar Pedidos Pagos**

```http
GET /api/orders?status=PAID
```

---

### **5. Ver Estatísticas**

```http
GET /api/payments/stats/overview
GET /api/digital-files/stats/overview
```

**Resposta:**
```json
{
  "totalPayments": 150,
  "approvedPayments": 142,
  "monthRevenue": 2385.50,
  "totalDownloads": 487
}
```

---

## 🔐 Segurança

### **Cliente não precisa login, mas validações existem:**

✅ **Download protegido:** Só baixa quem comprou (verifica email em `PurchaseHistory`)  
✅ **Webhook validado:** Verifica assinatura do Mercado Pago  
✅ **Arquivos privados:** Cloudinary em modo `authenticated`  
✅ **Admin protegido:** JWT token + role check  

---

## 📊 O Que Está Pronto vs Faltando

### ✅ **PRONTO:**

1. **Schema do Banco:**
   - ✅ `User` (admin)
   - ✅ `Product` (type: DIGITAL/PHYSICAL)
   - ✅ `ProductImage` (múltiplas imagens)
   - ✅ `DigitalFile` (arquivos para download)
   - ✅ `Order` (pedidos)
   - ✅ `Payment` (integração Mercado Pago)
   - ✅ `PurchaseHistory` (rastreamento de compras)
   - ✅ `Promotion` (descontos)
   - ✅ `Notification` (alertas para admin)

2. **Rotas Backend:**
   - ✅ `/api/products` - CRUD de produtos
   - ✅ `/api/orders` - Criar pedidos
   - ✅ `/api/payments` - Criar pagamento e webhook
   - ✅ `/api/digital-files` - Upload e download
   - ✅ `/api/purchases` - Histórico de compras do cliente
   - ✅ `/api/auth` - Login do admin

3. **Lógica de Negócio:**
   - ✅ Upload de arquivos (Cloudinary)
   - ✅ Validação de compra (email + productId)
   - ✅ Contador de downloads
   - ✅ Webhook do Mercado Pago
   - ✅ Criação automática de `PurchaseHistory` ao pagar

---

### ⚠️ **FALTANDO:**

1. **Integração Real do Mercado Pago:**
   - ⚠️ Instalar SDK: `npm install mercadopago`
   - ⚠️ Configurar credenciais no `.env`
   - ⚠️ Testar criação de preferência
   - ⚠️ Configurar webhook no painel MP

2. **Migrations:**
   - ⚠️ Rodar `npx prisma migrate dev` para criar novas tabelas

3. **Frontend:**
   - ⚠️ Página de loja (listar produtos)
   - ⚠️ Carrinho de compras
   - ⚠️ Checkout
   - ⚠️ Página "Meus Produtos" (downloads)
   - ⚠️ Painel admin

4. **Testes:**
   - ⚠️ Testar fluxo completo de compra
   - ⚠️ Testar download com email válido/inválido
   - ⚠️ Testar webhook do Mercado Pago

---

## 🚀 Próximos Passos

### **1. Aplicar migrations:**
```bash
npx prisma migrate dev --name add-digital-files-and-purchases
npx prisma generate
```

### **2. Instalar Mercado Pago:**
```bash
npm install mercadopago
```

### **3. Testar localmente:**
```bash
# Usar ngrok para webhook
ngrok http 3333

# Configurar webhook no MP com URL do ngrok
```

### **4. Desenvolver frontend:**
- React/Next.js com lista de produtos
- Integração com carrinho
- Página de "Meus Produtos"
- Painel admin

---

## 💡 Recomendações

### **Para Produtos Digitais:**

1. **Sem estoque:** Sempre `stock: 999` (ilimitado)
2. **Sem frete:** `shipping: 0`
3. **Status direto:** PENDING → PAID → Cliente baixa
4. **Email obrigatório:** Para rastrear compras
5. **Links temporários:** Considere URLs com expiração (S3 presigned URLs)

### **Para Segurança:**

1. **Rate limiting:** Limitar downloads por IP
2. **Watermark:** Adicionar email do cliente no PDF
3. **Log de downloads:** Rastrear abusos
4. **Email de confirmação:** Enviar link de download por email

---

## 📧 Email Automático (Sugestão)

Depois do pagamento, enviar email com:
```
Olá Maria!

Seu pagamento foi confirmado! 🎉

Pedido: ORD-20241130-ABC123
Total pago: R$ 15,90

Seus produtos:
- Jogo da Velha Interativo
  📥 Baixar arquivo: [Link]

Ou acesse seus produtos a qualquer momento:
https://seusite.com/meus-produtos?email=maria@email.com

Obrigada pela compra!
```

---

## 🆘 Suporte ao Cliente

**Cliente esqueceu o email?**
- ❌ Não pode baixar (segurança)
- ✅ Pedir para buscar no email de confirmação
- ✅ Admin pode buscar por nome/telefone

**Cliente não recebeu arquivo?**
- ✅ Verificar em "Meus Produtos"
- ✅ Admin verifica se pagamento foi aprovado
- ✅ Reenviar link por email

---

## 🎨 Exemplo de Interface

### **Página "Meus Produtos":**

```
┌─────────────────────────────────────────┐
│  🎁 Meus Produtos                       │
│                                         │
│  Digite seu email para acessar:        │
│  [maria@email.com        ] [Buscar]    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  📦 Comprado em 30/11/2024              │
│  ──────────────────────────────────────│
│  [IMG] Jogo da Velha Interativo        │
│        R$ 15,90                         │
│                                         │
│        📄 Jogo da Velha - Base.pdf     │
│           2.1 MB                        │
│           [📥 Baixar Arquivo]           │
└─────────────────────────────────────────┘
```

---

Agora você tem o **sistema completo estruturado**! 🎉

**Próximo passo:** Aplicar as migrations e testar o fluxo de ponta a ponta.
