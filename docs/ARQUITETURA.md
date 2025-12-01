# 📂 Arquitetura Refatorada - Service/Controller Pattern

## 🏗️ Nova Estrutura

```
src/
├── controllers/          # Lógica de request/response (HTTP)
│   ├── digital-file.controller.ts
│   ├── payment.controller.ts
│   └── purchase.controller.ts
│
├── services/            # Lógica de negócio (reutilizável)
│   ├── digital-file.service.ts
│   ├── payment.service.ts
│   ├── purchase.service.ts
│   └── mercadopago.service.ts
│
└── routes/              # Definição de rotas (mínimo de código)
    ├── digital-files.routes.ts
    ├── payments.routes.ts
    └── purchases.routes.ts
```

---

## 🎯 Responsabilidades

### **Routes (Rotas)**
- Define apenas os endpoints
- Aplica middlewares (auth, validation)
- Delega para controllers

```typescript
router.post(
  '/create',
  validate([...]),
  paymentController.create.bind(paymentController)
);
```

### **Controllers**
- Recebe req/res
- Extrai parâmetros
- Chama services
- Retorna resposta HTTP

```typescript
async create(req: Request, res: Response) {
  const { orderId, payerEmail } = req.body;
  const payment = await paymentService.createPayment({ ... });
  res.status(201).json(payment);
}
```

### **Services**
- Lógica de negócio pura
- Acessa banco de dados
- Validações complexas
- Reutilizável em diferentes contextos

```typescript
async createPayment(data: PaymentData) {
  const order = await prisma.order.findUnique({ ... });
  if (!order) throw new AppError('Pedido não encontrado');
  return await prisma.payment.create({ ... });
}
```

---

## ✅ Benefícios da Refatoração

### **1. Testabilidade**
```typescript
// Testar service sem HTTP
test('createPayment deve criar pagamento', async () => {
  const payment = await paymentService.createPayment({...});
  expect(payment).toBeDefined();
});
```

### **2. Reutilização**
```typescript
// Service pode ser usado em:
- Controllers HTTP
- Jobs/Workers
- Scripts CLI
- Webhooks
- Testes
```

### **3. Manutenibilidade**
```typescript
// Mudanças isoladas:
- Trocar Prisma por TypeORM? → Só nos services
- Mudar validação? → Só nas routes
- Trocar Express por Fastify? → Só nos controllers
```

### **4. Separação de Conceitos**
```typescript
// Cada camada tem uma responsabilidade:
Routes → "ONDE" (endpoints)
Controllers → "COMO" (HTTP)
Services → "O QUE" (negócio)
```

---

## 📦 Detalhes dos Services

### **DigitalFileService**
```typescript
- validateDigitalProduct(productId)
- checkPurchase(email, productId)
- createDigitalFile(data)
- listProductFiles(productId)
- getActiveFiles(productId)
- updateFile(fileId, data)
- deleteFile(fileId)
- incrementDownloadCount(productId)
- getDownloadStats()
```

### **PaymentService**
```typescript
- createPayment(data)
- getPaymentByMercadoPagoId(mercadoPagoId)
- updatePaymentFromWebhook(paymentId, data)
- processPaymentApproval(paymentId, webhookData)
- getPaymentById(paymentId)
- getPaymentByOrderId(orderId)
- listPayments(filters)
- requestRefund(paymentId, reason)
- getPaymentStats()
```

### **PurchaseService**
```typescript
- getCustomerPurchases(email)
- verifyPurchase(email, productId)
- createPurchase(data)
```

### **MercadoPagoService**
```typescript
- createPreference(order)
- getPayment(paymentId)
- refundPayment(paymentId, amount)
- mapStatus(mpStatus)
- verifyWebhook(xSignature, xRequestId, dataId)
```

---

## 🔄 Fluxo de Dados

### **Exemplo: Criar Pagamento**

```
[Cliente] 
   ↓ POST /api/payments/create
[Route]
   ↓ validate([...])
[Controller.create]
   ↓ extract req.body
[PaymentService.createPayment]
   ↓ validate order exists
[MercadoPagoService.createPreference]
   ↓ call MP API
[PaymentService.createPayment]
   ↓ save to database
[Controller.create]
   ↓ res.json(payment)
[Cliente]
   ↓ recebe response
```

---

## 🛡️ Tratamento de Erros

### **AppError nos Services**
```typescript
if (!product) {
  throw new AppError('Produto não encontrado', 404);
}
```

### **express-async-errors captura automaticamente**
```typescript
// Não precisa try/catch em todas as routes!
router.post('/create', controller.create);
// Erros são capturados pelo errorHandler middleware
```

---

## 🧪 Como Testar

### **1. Service Layer (Unit Tests)**
```typescript
describe('PaymentService', () => {
  it('deve criar pagamento', async () => {
    const payment = await paymentService.createPayment({
      orderId: 'uuid',
      amount: 100,
      payerEmail: 'test@test.com',
    });
    
    expect(payment).toHaveProperty('id');
    expect(payment.status).toBe('PENDING');
  });
});
```

### **2. Controller Layer (Integration Tests)**
```typescript
describe('POST /api/payments/create', () => {
  it('deve retornar 201 e criar pagamento', async () => {
    const res = await request(app)
      .post('/api/payments/create')
      .send({ orderId: 'uuid', payerEmail: 'test@test.com' });
    
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('payment');
  });
});
```

---

## 🚀 Próximos Passos

1. ✅ Services criados
2. ✅ Controllers criados
3. ✅ Routes refatoradas
4. ⏳ Aplicar migrations
5. ⏳ Instalar `npm install mercadopago`
6. ⏳ Testar fluxo completo

---

## 📝 Convenções

### **Nomes de Arquivos**
- Services: `*.service.ts`
- Controllers: `*.controller.ts`
- Routes: `*.routes.ts`

### **Export Pattern**
```typescript
// Singleton pattern
export default new PaymentService();

// Uso:
import paymentService from '../services/payment.service';
```

### **Controller Binding**
```typescript
// Necessário para manter contexto do this
paymentController.create.bind(paymentController)
```

---

## 🎨 Exemplo Completo

### **Route**
```typescript
router.post(
  '/create',
  validate([...]),
  paymentController.create.bind(paymentController)
);
```

### **Controller**
```typescript
async create(req: Request, res: Response) {
  const { orderId, payerEmail, payerName } = req.body;
  
  const preference = await mercadoPagoService.createPreference(order);
  const payment = await paymentService.createPayment({
    orderId, amount: order.total, payerEmail, payerName,
    preferenceId: preference.id
  });
  
  res.status(201).json({ payment, initPoint: preference.init_point });
}
```

### **Service**
```typescript
async createPayment(data: PaymentData) {
  const order = await prisma.order.findUnique({ where: { id: data.orderId } });
  if (!order) throw new AppError('Pedido não encontrado', 404);
  
  const existing = await prisma.payment.findUnique({ where: { orderId: data.orderId } });
  if (existing?.status === 'APPROVED') {
    throw new AppError('Pedido já foi pago', 400);
  }
  
  return await prisma.payment.create({ data: {...} });
}
```

---

Arquitetura limpa, testável e escalável! 🎉
