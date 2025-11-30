# 💳 Sistema de Pagamentos - Mercado Pago

## 📋 Estrutura Implementada

### **1. Schema do Banco de Dados**

```prisma
enum PaymentStatus {
  PENDING     // Aguardando pagamento
  PROCESSING  // Processando
  APPROVED    // Aprovado ✅
  REJECTED    // Rejeitado ❌
  REFUNDED    // Reembolsado
  CANCELLED   // Cancelado
}

enum PaymentMethod {
  CREDIT_CARD  // Cartão de crédito
  DEBIT_CARD   // Cartão de débito
  PIX          // PIX
  BOLETO       // Boleto bancário
  WALLET       // Carteira digital
}

model Payment {
  id: String
  orderId: String (único)
  amount: Float
  status: PaymentStatus
  method: PaymentMethod
  
  // Mercado Pago
  mercadoPagoId: String (único)
  preferenceId: String
  
  // Detalhes
  payerEmail: String
  payerName: String
  installments: Int
  
  // Webhook
  webhookData: Json
  approvedAt: DateTime
}
```

---

## 🔄 Fluxo Completo

### **1. Cliente faz pedido (Frontend)**

```javascript
// Frontend - Checkout
const response = await fetch('/api/payments/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orderId: "abc-123",
    payerEmail: "cliente@email.com",
    payerName: "João Silva",
    payerDocument: "12345678900"
  })
});

const { payment, initPoint } = await response.json();

// Redirecionar para página de pagamento do Mercado Pago
window.location.href = initPoint;
// OU abrir em modal
window.open(initPoint, '_blank');
```

---

### **2. Backend cria preferência (Servidor)**

```typescript
POST /api/payments/create
{
  "orderId": "abc-123",
  "payerEmail": "cliente@email.com",
  "payerName": "João Silva"
}

// Backend processa:
1. Busca o pedido no banco
2. Cria preferência no Mercado Pago
3. Salva Payment com status PENDING
4. Retorna initPoint (URL de pagamento)
```

**Resposta:**
```json
{
  "payment": {
    "id": "payment-uuid",
    "status": "PENDING",
    "amount": 100.00
  },
  "initPoint": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=xxx"
}
```

---

### **3. Cliente paga no Mercado Pago**

O cliente é redirecionado para a página do Mercado Pago onde:
- Escolhe forma de pagamento (PIX, Cartão, Boleto)
- Preenche dados de pagamento
- Confirma o pagamento

---

### **4. Mercado Pago notifica seu backend (Webhook)**

```typescript
// Mercado Pago automaticamente chama:
POST /api/payments/webhook
{
  "type": "payment",
  "data": {
    "id": "123456789" // ID do pagamento no MP
  }
}

// Seu backend:
1. Recebe notificação
2. Busca dados completos no MP
3. Atualiza Payment no banco
4. Atualiza Order para PAID
5. Cria notificação para admin
```

---

### **5. Cliente é redirecionado de volta**

Depois do pagamento, MP redireciona para:

**Sucesso:**
```
https://seusite.com/payment/success?payment_id=123&status=approved
```

**Falha:**
```
https://seusite.com/payment/failure?payment_id=123&status=rejected
```

**Pendente (Boleto/PIX):**
```
https://seusite.com/payment/pending?payment_id=123&status=pending
```

---

## 🛠️ Configuração

### **1. Criar conta no Mercado Pago**
1. Acesse: https://www.mercadopago.com.br/developers
2. Crie uma aplicação
3. Obtenha as credenciais:
   - `ACCESS_TOKEN` (produção)
   - `PUBLIC_KEY` (frontend)
   - Credenciais de teste também

### **2. Configurar .env**

```bash
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxxxx
MERCADO_PAGO_PUBLIC_KEY=APP_USR-xxxxxxxxxxxxxxx
MERCADO_PAGO_WEBHOOK_SECRET=seu-secret-aqui
BACKEND_URL=https://seu-backend.com
```

### **3. Instalar SDK**

```bash
npm install mercadopago
```

### **4. Configurar Webhook no Dashboard MP**

1. Acesse: https://www.mercadopago.com.br/developers/panel/app/webhooks
2. Configure URL: `https://seu-backend.com/api/payments/webhook`
3. Selecione eventos: `payment`

---

## 📡 Rotas da API

### **Públicas (sem autenticação):**

```bash
# Criar pagamento
POST /api/payments/create
Body: { orderId, payerEmail, payerName }

# Webhook do Mercado Pago
POST /api/payments/webhook
Body: { type, data }

# Verificar status
GET /api/payments/status/:orderId
```

### **Admin (com autenticação):**

```bash
# Listar pagamentos
GET /api/payments
GET /api/payments?status=APPROVED
GET /api/payments?method=PIX

# Detalhes
GET /api/payments/:id

# Reembolso
POST /api/payments/:id/refund
Body: { reason: "Motivo" }

# Estatísticas
GET /api/payments/stats/overview
```

---

## 🎯 Exemplo Completo - Frontend

### **Página de Checkout**

```javascript
// 1. Cliente finaliza carrinho
async function handleCheckout() {
  try {
    // Criar pedido
    const order = await createOrder({
      items: cartItems,
      customerName: "João",
      customerEmail: "joao@email.com",
      total: 150.00
    });

    // Criar pagamento
    const payment = await fetch('/api/payments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        payerEmail: order.customerEmail,
        payerName: order.customerName,
        payerDocument: cpf
      })
    });

    const { initPoint } = await payment.json();

    // Redirecionar para MP
    window.location.href = initPoint;

  } catch (error) {
    console.error('Erro no checkout:', error);
    alert('Erro ao processar pagamento');
  }
}
```

### **Página de Sucesso**

```javascript
// /payment/success?payment_id=123&status=approved

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const paymentId = params.get('payment_id');
  const status = params.get('status');

  if (status === 'approved') {
    // Buscar detalhes do pedido
    fetch(`/api/payments/status/${orderId}`)
      .then(res => res.json())
      .then(data => {
        showSuccess(`Pagamento confirmado! Pedido #${data.order.orderNumber}`);
      });
  }
}, []);
```

---

## 🔒 Segurança

### **Validar Webhook (Importante!)**

```typescript
// No webhook, validar assinatura
import crypto from 'crypto';

router.post('/webhook', (req, res) => {
  const xSignature = req.headers['x-signature'];
  const xRequestId = req.headers['x-request-id'];
  
  // Verificar se é realmente do Mercado Pago
  const isValid = verifyMercadoPagoWebhook(xSignature, xRequestId, req.body.data.id);
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Processar webhook...
});
```

### **Outras medidas:**

✅ Nunca expor `ACCESS_TOKEN` no frontend  
✅ Usar HTTPS em produção  
✅ Validar todos os webhooks  
✅ Log de todas as transações  
✅ Rate limiting nas rotas públicas  

---

## 📊 Status do Pedido vs Pagamento

```
PEDIDO                  PAGAMENTO
PENDING         →       PENDING (aguardando)
PAYMENT_PENDING →       PROCESSING (processando)
PAID            →       APPROVED (aprovado) ✅
PROCESSING      →       (pagamento já aprovado)
SHIPPED         →       (pagamento já aprovado)
DELIVERED       →       (pagamento já aprovado)
CANCELLED       →       CANCELLED
REFUNDED        →       REFUNDED
```

---

## 🧪 Testar em Desenvolvimento

### **Mercado Pago Sandbox:**

1. Use credenciais de teste
2. Cartões de teste:
   ```
   Aprovado: 5031 4332 1540 6351
   Rejeitado: 5031 7557 3453 0604
   CVV: 123
   Validade: qualquer futura
   ```

3. Testar PIX:
   - Gera QR Code de teste
   - Copia código
   - Simula pagamento no sandbox

---

## 🚀 Deploy

### **1. Configurar variáveis no servidor:**
```bash
MERCADO_PAGO_ACCESS_TOKEN=production_token
BACKEND_URL=https://api.seusite.com
```

### **2. Atualizar webhook no painel MP:**
```
https://api.seusite.com/api/payments/webhook
```

### **3. Testar pagamento real:**
- Fazer compra pequena
- Verificar se webhook chega
- Confirmar atualização no banco

---

## 📈 Próximas Melhorias

- [ ] Pagamento recorrente (assinaturas)
- [ ] Split payment (marketplace)
- [ ] Checkout transparente (sem sair do site)
- [ ] Múltiplas formas de pagamento
- [ ] Análise de fraude
- [ ] Relatórios financeiros

---

## 🆘 Troubleshooting

**Webhook não está chegando?**
- Verificar URL configurada no painel MP
- Testar com ngrok em desenvolvimento
- Verificar logs do servidor

**Pagamento não atualiza?**
- Verificar `mercadoPagoId` no banco
- Ver logs do webhook
- Testar manualmente a rota de webhook

**Erro ao criar preferência?**
- Verificar `ACCESS_TOKEN`
- Verificar formato dos items
- Ver resposta de erro do MP

---

## 📚 Documentação Oficial

- Mercado Pago: https://www.mercadopago.com.br/developers
- Webhooks: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
- SDK Node.js: https://github.com/mercadopago/sdk-nodejs
