# 🎨 Backend - Criatividade com Amor

Backend completo para e-commerce de **produtos digitais** (PDFs para impressão).

**Stack:** Node.js + Express + TypeScript + Prisma + PostgreSQL + Mercado Pago

---

## 📚 Documentação Completa

Toda documentação técnica está na pasta **`docs/`**:

- **[🚀 COMO_FUNCIONA.md](docs/COMO_FUNCIONA.md)** - **COMECE AQUI!** Funcionamento completo (login, imagens, banco de dados)
- **[📖 FLUXO_COMPLETO.md](docs/FLUXO_COMPLETO.md)** - Jornada do cliente (carrinho → pagamento → download)
- **[🏗️ ARQUITETURA.md](docs/ARQUITETURA.md)** - Padrão Service/Controller/Route
- **[💳 SISTEMA_PAGAMENTOS.md](docs/SISTEMA_PAGAMENTOS.md)** - Integração Mercado Pago
- **[🖼️ SISTEMA_IMAGENS.md](docs/SISTEMA_IMAGENS.md)** - Upload de imagens/arquivos
- **[📝 DECISOES_ARQUITETURA.md](docs/DECISOES_ARQUITETURA.md)** - Decisões técnicas
- **[✨ MELHORIAS_SUGERIDAS.md](docs/MELHORIAS_SUGERIDAS.md)** - Roadmap

---

## 🚀 Tecnologias

- **Node.js 22+** + **TypeScript 5.7**
- **Express 4.21** - Framework web
- **Prisma 5.22** - ORM type-safe
- **PostgreSQL** - Banco de dados
- **JWT** - Autenticação
- **Mercado Pago** - Gateway de pagamento
- **Cloudinary** - Upload de arquivos
- **Bcrypt** - Hash de senhas
- **Multer** - Upload de arquivos
- **Cloudinary** - Armazenamento de imagens (opcional)
- **Express Validator** - Validação de dados

## 📦 Estrutura do Projeto

```
backend/
├── prisma/
│   └── schema.prisma       # Schema do banco de dados
├── src/
│   ├── lib/
│   │   └── prisma.ts       # Cliente Prisma
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── upload.middleware.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── orders.routes.ts
│   │   ├── products.routes.ts
│   │   └── notifications.routes.ts
│   ├── utils/
│   │   ├── cloudinary.ts
│   │   └── validate.ts
│   └── server.ts           # Servidor principal
├── uploads/                # Uploads locais
├── .env                    # Variáveis de ambiente
├── package.json
└── tsconfig.json
```

## 🛠️ Instalação

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e configure:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/criatividade_amor"
PORT=3333
JWT_SECRET=sua-chave-secreta-aqui
FRONTEND_URL=http://localhost:5173

# Cloudinary (opcional)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### 3. Configurar banco de dados

```bash
# Gerar cliente Prisma
npm run prisma:generate

# Executar migrations
npm run prisma:migrate

# Seed (dados iniciais)
npm run seed
```

### 4. Iniciar servidor

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

O servidor estará rodando em `http://localhost:3333`

## 📚 API Endpoints

### Autenticação (`/api/auth`)

- `POST /login` - Login
- `GET /me` - Dados do usuário logado
- `PUT /profile` - Atualizar perfil
- `POST /logout` - Logout

### Pedidos (`/api/orders`)

- `GET /orders` - Listar pedidos (com filtros, paginação, busca)
- `GET /orders/stats` - Estatísticas do dashboard
- `GET /orders/:id` - Detalhes de um pedido
- `PUT /orders/:id` - Atualizar status/rastreio
- `POST /orders` - Criar pedido

### Produtos (`/api/products`)

- `GET /products` - Listar produtos
- `GET /products/:id` - Detalhes do produto
- `POST /products` - Criar produto
- `PUT /products/:id` - Atualizar produto
- `DELETE /products/:id` - Deletar produto
- `POST /products/upload` - Upload de imagem

### Notificações (`/api/notifications`)

- `GET /notifications` - Listar notificações
- `PUT /notifications/:id/read` - Marcar como lida
- `PUT /notifications/read-all` - Marcar todas como lidas
- `DELETE /notifications/:id` - Deletar notificação

## 🔐 Autenticação

Todas as rotas (exceto `/login`) requerem autenticação via JWT token.

Envie o token no header:
```
Authorization: Bearer {seu-token-aqui}
```

## 📊 Modelos de Dados

### User
```typescript
{
  id: string
  name: string
  email: string
  password: string (hash)
  role: 'ADMIN' | 'SUPER_ADMIN'
  avatar?: string
  createdAt: DateTime
}
```

### Order
```typescript
{
  id: string
  orderNumber: string
  customerName: string
  customerEmail?: string
  items: Array<{
    productId: string
    title: string
    price: number
    quantity: number
    image?: string
  }>
  total: number
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  trackingCode?: string
  shippingAddress?: object
  createdAt: DateTime
}
```

### Product
```typescript
{
  id: string
  title: string
  description?: string
  price: number
  comparePrice?: number
  stock: number
  image?: string
  category?: string
  tags: string[]
  featured: boolean
  active: boolean
  sales: number
  sku?: string
  createdAt: DateTime
}
```

### Notification
```typescript
{
  id: string
  userId: string
  type: 'NEW_ORDER' | 'ORDER_UPDATE' | 'LOW_STOCK' | 'SYSTEM'
  title: string
  message: string
  read: boolean
  data?: object
  createdAt: DateTime
}
```

## 🧪 Dados de Teste

Após executar `npm run seed`, você terá:

**Admin:**
- Email: `admin@criatividade.com`
- Senha: `admin123`

**Produtos e pedidos de exemplo** também são criados.

## 🔧 Scripts Disponíveis

- `npm run dev` - Inicia em modo desenvolvimento (com watch)
- `npm run build` - Compila TypeScript
- `npm start` - Inicia em produção
- `npm run prisma:generate` - Gera cliente Prisma
- `npm run prisma:migrate` - Executa migrations
- `npm run prisma:studio` - Abre Prisma Studio (GUI)
- `npm run seed` - Popula banco com dados iniciais

## 📝 Features Implementadas

✅ Autenticação JWT completa  
✅ CRUD de pedidos com filtros e busca  
✅ CRUD de produtos com upload de imagens  
✅ Sistema de notificações em tempo real  
✅ Dashboard com estatísticas  
✅ Paginação e ordenação  
✅ Upload local e Cloudinary  
✅ Validações robustas  
✅ Error handling  
✅ TypeScript  
✅ Prisma ORM  

## 🚀 Próximos Passos

- [ ] WebSocket para notificações em tempo real
- [ ] Rate limiting
- [ ] Testes unitários e e2e
- [ ] Documentação Swagger/OpenAPI
- [ ] Integração com gateway de pagamento
- [ ] Cálculo de frete
- [ ] Sistema de cupons/descontos

## 📄 Licença

MIT

---

Desenvolvido com ❤️ para Criatividade com Amor

