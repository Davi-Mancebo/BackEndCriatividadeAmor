# 🧪 Testes Completos - Postman

Execute os testes nesta ordem para garantir que tudo funcione corretamente.

---

## ⭐ **UPLOAD MÚLTIPLO DE IMAGENS (NOVO!)**

**Método:** `POST`  
**URL:** `http://localhost:3333/api/products/1/images/bulk`

*Troque o `1` pelo ID do produto*

**Headers:**
```
Authorization: Bearer SEU_TOKEN_AQUI
```

**Body (form-data):**
| Key | Type | Value |
|-----|------|-------|
| `images` | File | *Selecione 3-5 imagens JPG/PNG* |
| `images` | File | *Adicione mais imagens (clique em +)* |
| `images` | File | *Até 10 imagens por requisição* |
| `alts` | Text | `["Imagem 1", "Imagem 2", "Imagem 3"]` *(opcional)* |

**✅ Sucesso:** Status 201 + Array com todas as imagens salvas individualmente no Cloudinary

**🎯 Cada imagem é salva como registro separado no banco!** Você pode deletar individualmente depois.

---

## 1️⃣ **LOGIN - Obter Token**

**Método:** `POST`  
**URL:** `http://localhost:3333/api/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "email": "admin@criatividade.com",
  "password": "admin123"
}
```

**✅ Sucesso:** Status 200 + Token JWT

**📋 COPIE O TOKEN da resposta!** Você vai usar em todas as próximas requisições.

---

## 2️⃣ **LISTAR PRODUTOS - Ver produtos disponíveis**

**Método:** `GET`  
**URL:** `http://localhost:3333/api/products`

**Headers:**
```
Authorization: Bearer SEU_TOKEN_AQUI
```

**✅ Sucesso:** Status 200 + Lista de 3 produtos

**📋 COPIE O ID de um produto** (ex: 1, 2 ou 3) para usar no upload de imagens.

---

## 3️⃣ **UPLOAD PRIMEIRA IMAGEM - Imagem Principal**

**Método:** `POST`  
**URL:** `http://localhost:3333/api/products/1/images`

*Troque o `1` pelo ID do produto que você copiou*

**Headers:**
```
Authorization: Bearer SEU_TOKEN_AQUI
```

**Body (form-data):**
| Key | Type | Value |
|-----|------|-------|
| `image` | File | *Selecione uma imagem JPG/PNG* |
| `altText` | Text | `Imagem principal do produto` |
| `isPrimary` | Text | `true` |

**✅ Sucesso:** Status 201 + URL da imagem no Cloudinary

---

## 4️⃣ **UPLOAD SEGUNDA IMAGEM - Imagem Secundária**

**Método:** `POST`  
**URL:** `http://localhost:3333/api/products/1/images`

*Use o mesmo ID do produto*

**Headers:**
```
Authorization: Bearer SEU_TOKEN_AQUI
```

**Body (form-data):**
| Key | Type | Value |
|-----|------|-------|
| `image` | File | *Selecione outra imagem JPG/PNG* |
| `altText` | Text | `Imagem secundária do produto` |
| `isPrimary` | Text | `false` |

**✅ Sucesso:** Status 201 + URL da segunda imagem no Cloudinary

---

## 5️⃣ **LISTAR IMAGENS DO PRODUTO**

**Método:** `GET`  
**URL:** `http://localhost:3333/api/products/1/images`

**Headers:**
```
Authorization: Bearer SEU_TOKEN_AQUI
```

**✅ Sucesso:** Status 200 + Array com 2 imagens (URLs do Cloudinary)

---

## 6️⃣ **VER DETALHES DO PRODUTO (com imagens)**

**Método:** `GET`  
**URL:** `http://localhost:3333/api/products/1`

**Headers:**
```
Authorization: Bearer SEU_TOKEN_AQUI
```

**✅ Sucesso:** Status 200 + Produto com array `images` contendo 2 imagens

---

## 7️⃣ **CRIAR NOVO PRODUTO**

**Método:** `POST`  
**URL:** `http://localhost:3333/api/products`

**Headers:**
```
Authorization: Bearer SEU_TOKEN_AQUI
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "title": "Quebra-Cabeça Educativo 100 Peças",
  "description": "Quebra-cabeça com tema educativo, ideal para crianças de 5 a 10 anos",
  "price": 45.90,
  "comparePrice": 59.90,
  "stock": 50,
  "category": "Educativos",
  "tags": ["quebra-cabeça", "educativo", "infantil"],
  "type": "PHYSICAL",
  "condition": "NEW",
  "featured": true,
  "sku": "QC-EDU-100",
  "weight": 0.5,
  "dimensions": "30x30x5cm"
}
```

**✅ Sucesso:** Status 201 + Novo produto criado

**📋 COPIE O ID do novo produto** para adicionar imagens nele também.

---

## 8️⃣ **CRIAR PEDIDO**

**Método:** `POST`  
**URL:** `http://localhost:3333/api/orders`

**Headers:**
```
Authorization: Bearer SEU_TOKEN_AQUI
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "price": 89.90
    },
    {
      "productId": 2,
      "quantity": 1,
      "price": 129.90
    }
  ],
  "shippingAddress": {
    "street": "Rua das Flores",
    "number": "123",
    "complement": "Apto 45",
    "neighborhood": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01234-567"
  },
  "paymentMethod": "CREDIT_CARD"
}
```

**✅ Sucesso:** Status 201 + Pedido criado com status PENDING

---

## 9️⃣ **LISTAR PEDIDOS**

**Método:** `GET`  
**URL:** `http://localhost:3333/api/orders`

**Headers:**
```
Authorization: Bearer SEU_TOKEN_AQUI
```

**Query params opcionais:**
- `?status=PENDING` - Filtrar por status
- `?page=1&limit=10` - Paginação

**✅ Sucesso:** Status 200 + Lista de pedidos

---

## 🔟 **ATUALIZAR STATUS DO PEDIDO**

**Método:** `PUT`  
**URL:** `http://localhost:3333/api/orders/1`

**Headers:**
```
Authorization: Bearer SEU_TOKEN_AQUI
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "status": "PROCESSING",
  "trackingCode": "BR123456789",
  "notes": "Pedido em separação"
}
```

**✅ Sucesso:** Status 200 + Pedido atualizado + Notificação criada

---

## 1️⃣1️⃣ **CRIAR PROMOÇÃO**

**Método:** `POST`  
**URL:** `http://localhost:3333/api/promotions`

**Headers:**
```
Authorization: Bearer SEU_TOKEN_AQUI
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "name": "Black Friday - Jogo da Velha",
  "description": "Desconto especial de Black Friday",
  "type": "PERCENTAGE",
  "value": 30,
  "productId": 1,
  "startDate": "2025-11-29T00:00:00Z",
  "endDate": "2025-12-05T23:59:59Z",
  "active": true
}
```

**✅ Sucesso:** Status 201 + Promoção criada

---

## 1️⃣2️⃣ **LISTAR PROMOÇÕES ATIVAS**

**Método:** `GET`  
**URL:** `http://localhost:3333/api/promotions?active=true`

**Headers:**
```
Authorization: Bearer SEU_TOKEN_AQUI
```

**✅ Sucesso:** Status 200 + Lista de promoções ativas

---

## 1️⃣3️⃣ **LISTAR NOTIFICAÇÕES**

**Método:** `GET`  
**URL:** `http://localhost:3333/api/notifications`

**Headers:**
```
Authorization: Bearer SEU_TOKEN_AQUI
```

**✅ Sucesso:** Status 200 + Lista de notificações (incluindo a do pedido atualizado)

---

## 1️⃣4️⃣ **MARCAR NOTIFICAÇÃO COMO LIDA**

**Método:** `PATCH`  
**URL:** `http://localhost:3333/api/notifications/1/read`

**Headers:**
```
Authorization: Bearer SEU_TOKEN_AQUI
```

**✅ Sucesso:** Status 200 + Notificação marcada como lida

---

## 1️⃣5️⃣ **REORDENAR IMAGENS DO PRODUTO**

**Método:** `PUT`  
**URL:** `http://localhost:3333/api/products/1/images/reorder`

**Headers:**
```
Authorization: Bearer SEU_TOKEN_AQUI
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "imageIds": [2, 1]
}
```

*Inverte a ordem das imagens - a segunda vira primeira*

**✅ Sucesso:** Status 200 + Ordem atualizada

---

## 1️⃣6️⃣ **DELETAR IMAGEM**

**Método:** `DELETE`  
**URL:** `http://localhost:3333/api/products/1/images/2`

**Headers:**
```
Authorization: Bearer SEU_TOKEN_AQUI
```

**✅ Sucesso:** Status 200 + Imagem deletada do Cloudinary e do banco

---

## 1️⃣7️⃣ **ATUALIZAR PERFIL DO USUÁRIO**

**Método:** `PUT`  
**URL:** `http://localhost:3333/api/auth/profile`

**Headers:**
```
Authorization: Bearer SEU_TOKEN_AQUI
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "name": "Administrador Sistema",
  "phone": "(11) 98765-4321"
}
```

**✅ Sucesso:** Status 200 + Perfil atualizado

---

## 1️⃣8️⃣ **ESTATÍSTICAS DE PEDIDOS**

**Método:** `GET`  
**URL:** `http://localhost:3333/api/orders/stats`

**Headers:**
```
Authorization: Bearer SEU_TOKEN_AQUI
```

**✅ Sucesso:** Status 200 + Estatísticas (total, por status, receita)

---

## 1️⃣9️⃣ **HEALTH CHECK (sem autenticação)**

**Método:** `GET`  
**URL:** `http://localhost:3333/health`

**✅ Sucesso:** Status 200 + `{ "status": "ok", "timestamp": "..." }`

---

## 📝 **NOTAS IMPORTANTES:**

1. **Ordem recomendada:** Execute os testes na ordem numérica para melhor experiência
2. **Token expira:** Se receber erro 401, faça login novamente (#1)
3. **IDs dinâmicos:** Ajuste os IDs conforme os recursos criados no seu banco
4. **Cloudinary ativo:** As imagens são enviadas para o Cloudinary (CDN)
5. **Mercado Pago:** Ainda não configurado (warnings normais)

---

## 🎯 **FOCO: Adicionar 2 Imagens em um Produto**

Para seu objetivo específico:

1. Execute o teste **#1** (Login) → Pegue o token
2. Execute o teste **#2** (Listar Produtos) → Pegue um ID de produto
3. Execute o teste **#3** (Upload Primeira Imagem) → Imagem principal
4. Execute o teste **#4** (Upload Segunda Imagem) → Imagem secundária
5. Execute o teste **#5** (Listar Imagens) → Confirme que as 2 imagens foram salvas
6. Execute o teste **#6** (Ver Produto) → Veja o produto com as 2 imagens incluídas

✅ **Pronto!** Seu produto agora tem 2 imagens hospedadas no Cloudinary!
