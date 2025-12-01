# 🎨 Backend - Criatividade com Amor

Backend completo para e-commerce com suporte a **produtos físicos e digitais**.

**Stack:** Node.js + Express + TypeScript + Prisma + PostgreSQL + Mercado Pago + Cloudinary

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-336791.svg)](https://www.postgresql.org/)

---

## 📚 Documentação Completa

Toda documentação técnica está organizada na pasta **`docs/`**:

### 🎯 **Começar Aqui:**
- **[🚀 COMO_FUNCIONA.md](docs/COMO_FUNCIONA.md)** - Funcionamento completo do sistema (login, imagens, banco)
- **[📖 FLUXO_COMPLETO.md](docs/FLUXO_COMPLETO.md)** - Jornada do cliente (carrinho → pagamento → download)

### 🏗️ **Arquitetura:**
- **[🏛️ ARQUITETURA.md](docs/ARQUITETURA.md)** - Padrão Service/Controller/Route
- **[📝 DECISOES_ARQUITETURA.md](docs/DECISOES_ARQUITETURA.md)** - Decisões técnicas e refatorações
- **[♻️ REFATORACAO_COMPLETA.md](docs/REFATORACAO_COMPLETA.md)** - Histórico de refatorações

### 🔧 **Sistemas:**
- **[💳 SISTEMA_PAGAMENTOS.md](docs/SISTEMA_PAGAMENTOS.md)** - Integração Mercado Pago (webhooks, status)
- **[🖼️ SISTEMA_IMAGENS.md](docs/SISTEMA_IMAGENS.md)** - Upload múltiplo, Cloudinary, reordenação

### 📡 **API:**
- **[📋 API_ROTAS.md](docs/API_ROTAS.md)** - Documentação completa de todos os endpoints

### 🧪 **Testes:**
- **[🧪 POSTMAN_TESTS.md](docs/POSTMAN_TESTS.md)** - Collection de testes (login, produtos, imagens)

---

## 🚀 Tecnologias

### **Backend:**
- **Node.js 22+** - Runtime JavaScript
- **TypeScript 5.7** - Type safety
- **Express 4.21** - Framework web minimalista
- **Prisma 5.22** - ORM type-safe com migrations

### **Banco de Dados:**
- **PostgreSQL** - Banco relacional robusto

### **Autenticação:**
- **JWT** - Tokens stateless
- **Bcrypt** - Hash de senhas (10 rounds)

### **Pagamentos:**
- **Mercado Pago SDK** - Integração completa (PIX, Cartão, Boleto)

### **Upload:**
- **Multer** - Upload de arquivos
- **Cloudinary** - CDN e armazenamento (opcional)

### **Validação:**
- **Express Validator** - Validação de inputs
- **Express Async Errors** - Error handling automático

---

## 📦 Estrutura do Projeto

```
backend/
├── prisma/
│   ├── schema.prisma           # Schema do banco de dados
│   ├── migrations/             # Histórico de migrations
│   └── seed.ts                 # Dados iniciais
│
├── src/
│   ├── controllers/            # HTTP handlers (12 arquivos)
│   │   ├── auth.controller.ts
│   │   ├── customers.controller.ts
│   │   ├── orders.controller.ts
│   │   ├── products.controller.ts
│   │   ├── product-images.controller.ts
│   │   ├── payments.controller.ts
│   │   ├── digital-file.controller.ts
│   │   ├── promotions.controller.ts
│   │   ├── purchase.controller.ts
│   │   ├── reviews.controller.ts
│   │   ├── sales-goals.controller.ts
│   │   └── notifications.controller.ts
│   │
│   ├── services/              # Business logic (13 arquivos)
│   │   ├── auth.service.ts
│   │   ├── customers.service.ts
│   │   ├── orders.service.ts
│   │   ├── products.service.ts
│   │   ├── product-images.service.ts
│   │   ├── payments.service.ts
│   │   ├── mercadopago.service.ts
│   │   ├── digital-file.service.ts
│   │   ├── promotions.service.ts
│   │   ├── purchase.service.ts
│   │   ├── reviews.service.ts
│   │   ├── sales-goals.service.ts
│   │   └── notifications.service.ts
│   │
│   ├── routes/                # Route definitions (13 arquivos)
│   │   ├── index.ts
│   │   ├── auth.routes.ts
│   │   ├── customers.routes.ts
│   │   ├── orders.routes.ts
│   │   ├── products.routes.ts
│   │   ├── product-images.routes.ts
│   │   ├── payments.routes.ts
│   │   ├── digital-files.routes.ts
│   │   ├── promotions.routes.ts
│   │   ├── purchases.routes.ts
│   │   ├── reviews.routes.ts
│   │   ├── sales-goals.routes.ts
│   │   └── notifications.routes.ts
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.ts    # JWT validation
│   │   ├── error.middleware.ts   # Error handler
│   │   └── upload.middleware.ts  # Multer config
│   │
│   ├── utils/
│   │   ├── cloudinary.ts         # Upload/delete Cloudinary
│   │   └── validate.ts           # Express validator helper
│   │
│   ├── lib/
│   │   └── prisma.ts             # Prisma client singleton
│   │
│   └── server.ts                 # Express app
│
├── uploads/                      # Local file storage
├── docs/                         # Documentação técnica (12 arquivos)
├── .env                          # Variáveis de ambiente
├── .env.example                  # Template de configuração
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🛠️ Instalação

### 1. Clonar repositório

```bash
git clone https://github.com/seu-usuario/BackEndCriatividadeAmor.git
cd BackEndCriatividadeAmor
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/criatividade_amor?schema=public"

# Server
PORT=3333
NODE_ENV=development

# JWT
JWT_SECRET=sua-chave-secreta-super-segura-aqui
JWT_EXPIRES_IN=7d

# Cloudinary (opcional)
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret

# CORS
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3333

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=seu_access_token_aqui
MERCADO_PAGO_PUBLIC_KEY=seu_public_key_aqui
MERCADO_PAGO_WEBHOOK_SECRET=seu_webhook_secret_aqui
```

### 4. Configurar banco de dados

```bash
# Gerar cliente Prisma
npm run prisma:generate

# Executar migrations
npm run prisma:migrate

# Popular banco com dados iniciais
npm run seed
```

### 5. Iniciar servidor

```bash
# Desenvolvimento (com watch)
npm run dev

# Produção
npm run build
npm start
```

O servidor estará rodando em `http://localhost:3333`

---

## 🔧 Scripts Disponíveis

```bash
npm run dev              # Inicia em modo desenvolvimento (tsx watch)
npm run build            # Compila TypeScript para JavaScript
npm start                # Inicia versão compilada (produção)

npm run prisma:generate  # Gera tipos TypeScript do Prisma
npm run prisma:migrate   # Executa migrations do banco
npm run prisma:studio    # Abre interface visual do banco
npm run seed             # Popula banco com dados iniciais
```

---

## ✨ Features Implementadas

### **🔐 Autenticação & Autorização:**
✅ JWT com tokens stateless (7 dias de validade)  
✅ Middleware de autenticação (authMiddleware)  
✅ Middleware de admin (adminMiddleware)  
✅ Hash de senhas com bcrypt (10 rounds)  
✅ Atualização de perfil com troca de senha  

### **🛍️ Produtos:**
✅ CRUD completo com soft delete  
✅ Upload múltiplo de imagens (até 10 por vez)  
✅ Reordenação de imagens (drag & drop)  
✅ Produtos físicos e digitais  
✅ Sistema de promoções com desconto percentual  
✅ Busca avançada (título, descrição, categoria, tags)  
✅ Paginação e ordenação  
✅ Estoque com notificação de baixo estoque  

### **📦 Pedidos:**
✅ Criação de pedidos (físicos e digitais)  
✅ Busca multifield (ID, nome, email, valor, data, tracking)  
✅ Filtros por status e período  
✅ Estatísticas do dashboard (statusCounts otimizado - 75% menos API calls)  
✅ Sistema de rastreio  
✅ Histórico completo de compras  

### **💳 Pagamentos:**
✅ Integração completa com Mercado Pago  
✅ Webhook validado com assinatura  
✅ Suporte a PIX, Cartão, Boleto  
✅ Status tracking (PENDING → APPROVED)  
✅ Sistema de reembolso  
✅ Estatísticas financeiras  

### **📥 Arquivos Digitais:**
✅ Upload de PDFs/ZIPs para produtos  
✅ Download protegido (validação de compra)  
✅ Contador de downloads  
✅ Geração de ZIP com múltiplos arquivos  

### **🔔 Notificações:**
✅ Notificações automáticas (novo pedido, estoque baixo)  
✅ Marcar como lida individual ou todas  
✅ Deletar notificações  

### **🛡️ Qualidade de Código:**
✅ Arquitetura Service/Controller/Route  
✅ Error handling completo (try-catch em todos os 12 controllers)  
✅ Validação com express-validator em todas as 13 rotas  
✅ TypeScript com strict mode (0 erros)  
✅ Índices no banco para performance (4 índices otimizados)  
✅ Migrations versionadas  

---

## 📡 API Endpoints

### **Autenticação (`/api/auth`)**
```
POST   /login          - Login (retorna token JWT)
GET    /me             - Dados do usuário logado
PUT    /profile        - Atualizar perfil
```

### **Produtos (`/api/products`)**
```
GET    /               - Listar produtos (filtros, paginação)
GET    /:id            - Detalhes do produto
POST   /               - Criar produto
PUT    /:id            - Atualizar produto
DELETE /:id            - Soft delete (desativar)
DELETE /:id/permanent  - Hard delete (deletar permanentemente)
```

### **Imagens de Produtos (`/api/products/:productId/images`)**
```
POST   /               - Upload de imagem
POST   /bulk           - Upload múltiplo (até 10)
GET    /               - Listar imagens
PUT    /:imageId       - Atualizar ordem/alt
DELETE /:imageId       - Deletar imagem
PUT    /reorder        - Reordenar imagens
```

### **Pedidos (`/api/orders`)**
```
GET    /               - Listar pedidos (busca multifield, filtros)
GET    /stats          - Estatísticas do dashboard (otimizado)
GET    /:id            - Detalhes do pedido
POST   /               - Criar pedido
PUT    /:id            - Atualizar status/tracking
```

### **Pagamentos (`/api/payments`)**
```
POST   /create         - Criar pagamento (Mercado Pago)
POST   /webhook        - Webhook do MP (validado)
GET    /status/:id     - Status do pagamento
GET    /               - Listar pagamentos (admin)
POST   /:id/refund     - Reembolso (admin)
GET    /stats          - Estatísticas (admin)
```

### **Promoções (`/api/promotions`)**
```
GET    /                      - Listar promoções
GET    /:id                   - Detalhes
POST   /                      - Criar promoção
PUT    /:id                   - Atualizar
DELETE /:id                   - Deletar
GET    /product/:id/active    - Promoção ativa do produto
```

### **Arquivos Digitais (`/api/digital-files`)**
```
GET    /download/:id          - Download (validação de compra)
GET    /check-access/:id      - Verificar acesso
POST   /:productId            - Upload (admin)
GET    /:productId            - Listar (admin)
PUT    /:id                   - Atualizar (admin)
DELETE /:id                   - Deletar (admin)
GET    /stats                 - Estatísticas (admin)
```

### **Compras (`/api/purchases`)**
```
GET    /my-products           - Produtos comprados (por email)
GET    /verify/:orderId       - Verificar compra
```

### **Notificações (`/api/notifications`)**
```
GET    /               - Listar notificações
PUT    /:id/read       - Marcar como lida
PUT    /read-all       - Marcar todas
DELETE /:id            - Deletar
```

**Veja documentação completa em:** [📋 API_ROTAS.md](docs/API_ROTAS.md)

---

## 🧪 Dados de Teste (Seed)

Após executar `npm run seed`, você terá:

**Admin:**
- Email: `admin@criatividade.com`
- Senha: `admin123`
- Role: `SUPER_ADMIN`

**Produtos de exemplo:**
- 8 produtos com imagens e estoque
- Mix de produtos físicos e digitais

**Pedidos de exemplo:**
- 59 pedidos distribuídos em todos os status
- 14 PROCESSING, 13 PAID, 13 SHIPPED, 12 DELIVERED, 6 CANCELLED, 1 PENDING

---

## 🔐 Autenticação

Todas as rotas (exceto `/login` e rotas públicas de pagamento) requerem autenticação via JWT.

**Enviar token no header:**
```
Authorization: Bearer {seu-token-aqui}
```

**Exemplo com fetch:**
```javascript
const response = await fetch('http://localhost:3333/api/products', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**Exemplo com Axios:**
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
```

---

## 🔮 Roadmap (Próximos Passos)

### **Alta Prioridade:**
- [ ] Testes unitários (Jest) para services
- [ ] Testes de integração (Supertest) para API
- [ ] Rate limiting (express-rate-limit)
- [ ] CORS configurado para produção
- [ ] Docker + Docker Compose

### **Média Prioridade:**
- [ ] WebSocket para notificações em tempo real
- [ ] Email transacional (SendGrid/AWS SES)
- [ ] Swagger/OpenAPI documentation
- [ ] Cálculo de frete (Correios API)
- [ ] Sistema de cupons de desconto
- [ ] Análise de vendas (gráficos)

### **Baixa Prioridade:**
- [ ] Cache com Redis
- [ ] Logs estruturados (Winston/Pino)
- [ ] Backup automático do banco
- [ ] CI/CD (GitHub Actions)
- [ ] Monitoramento (Sentry/DataDog)

---

## 🤝 Contribuindo

Este é um projeto privado, mas sugestões são bem-vindas!

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/NovaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona NovaFeature'`)
4. Push para a branch (`git push origin feature/NovaFeature`)
5. Abra um Pull Request

---

## 📄 Licença

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 📞 Contato & Suporte

- **Desenvolvedor:** Davi Mancebo
- **GitHub:** [@davi-mancebo](https://github.com/davi-mancebo)
- **Email:** davimancebo@gmail.com

---

## 🙏 Agradecimentos

- Comunidade TypeScript
- Time do Prisma
- Documentação do Express
- Mercado Pago Developers

---

<div align="center">
  
**Desenvolvido com ❤️ e ☕ para Criatividade com Amor**

[![Made with TypeScript](https://img.shields.io/badge/Made%20with-TypeScript-blue)](https://www.typescriptlang.org/)
[![Powered by Node.js](https://img.shields.io/badge/Powered%20by-Node.js-green)](https://nodejs.org/)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success)](https://github.com)

</div>

