# 🖼️ Sistema de Imagens - Nova Estrutura

## ✅ O que foi implementado:

### 1. **Nova Tabela `ProductImage`**
```sql
- id: UUID único
- productId: Referência ao produto
- url: URL da imagem
- alt: Texto alternativo (SEO)
- order: Ordem de exibição (0 = principal)
```

### 2. **Relacionamento no Prisma**
```prisma
Product {
  images: ProductImage[] // Um produto tem várias imagens
}

ProductImage {
  product: Product // Cada imagem pertence a um produto
  onDelete: Cascade // Se deletar produto, deleta imagens
}
```

---

## 📍 Novas Rotas de Imagens:

### **POST** `/api/products/:productId/images`
Adicionar imagem a um produto
```json
// Form-data
{
  "image": File,
  "alt": "Descrição da imagem (opcional)",
  "order": 0 // Ordem (opcional, auto-incrementa)
}
```

### **GET** `/api/products/:productId/images`
Listar todas as imagens de um produto (ordenadas)

### **PUT** `/api/products/:productId/images/:imageId`
Atualizar alt text ou ordem de uma imagem
```json
{
  "alt": "Nova descrição",
  "order": 2
}
```

### **DELETE** `/api/products/:productId/images/:imageId`
Deletar uma imagem específica

### **PUT** `/api/products/:productId/images/reorder`
Reordenar todas as imagens de uma vez
```json
{
  "imageIds": ["uuid1", "uuid2", "uuid3"]
}
```

---

## 🔄 Mudanças nas Rotas de Produtos:

### **GET** `/api/products`
Agora retorna produtos COM imagens:
```json
{
  "id": "...",
  "title": "Produto",
  "images": [
    {
      "id": "...",
      "url": "/uploads/image.jpg",
      "alt": "Descrição",
      "order": 0
    }
  ]
}
```

### **POST** `/api/products`
- ✅ Removido campo `image`
- ✅ Validação de SKU único
- ✅ Conversão correta de `featured` (Boolean)
- ✅ Notificação de estoque baixo no CREATE

### **PUT** `/api/products/:id`
- ✅ Validação de SKU único ao atualizar
- ✅ Conversão correta de boolean

### **DELETE** `/api/products/:id`
- ✅ Agora é SOFT DELETE (desativa)
- ✅ Nova rota `/permanent` para hard delete

---

## 🎯 Workflow de Uso:

### 1. Criar produto
```bash
POST /api/products
{
  "title": "Colar Artesanal",
  "price": 89.90,
  "stock": 10
}
# Retorna: { id: "abc123", ... }
```

### 2. Adicionar imagens
```bash
POST /api/products/abc123/images
Form-data: image=file1.jpg, order=0

POST /api/products/abc123/images
Form-data: image=file2.jpg, order=1

POST /api/products/abc123/images
Form-data: image=file3.jpg, order=2
```

### 3. Listar produto com imagens
```bash
GET /api/products/abc123
# Retorna produto com array de images ordenado
```

### 4. Trocar ordem (arrastar no frontend)
```bash
PUT /api/products/abc123/images/reorder
{
  "imageIds": ["img3", "img1", "img2"] // Nova ordem
}
```

### 5. Deletar imagem específica
```bash
DELETE /api/products/abc123/images/img2
```

---

## ⚙️ Próximos Passos:

### 1. Executar migration:
```bash
npm run prisma:migrate
# Nome: "add_product_images_table"
```

### 2. Atualizar seed:
```typescript
// Adicionar imagens aos produtos de exemplo
await prisma.productImage.createMany({
  data: [
    {
      productId: produto1.id,
      url: "https://...",
      alt: "Imagem principal",
      order: 0,
    }
  ]
})
```

### 3. Testar rotas:
```bash
# Iniciar servidor
npm run dev

# Testar upload
curl -X POST http://localhost:3333/api/products/{id}/images \
  -H "Authorization: Bearer {token}" \
  -F "image=@foto.jpg" \
  -F "order=0"
```

---

## 🎨 Vantagens da nova estrutura:

✅ **Múltiplas imagens** sem limite  
✅ **Ordem personalizável** (arrastar e soltar)  
✅ **SEO otimizado** (alt text por imagem)  
✅ **Fácil manutenção** (deletar/adicionar individual)  
✅ **Queries eficientes** (índices + relações)  
✅ **Soft delete** (não perde dados)  
✅ **Cascade delete** (limpa imagens órfãs)  
✅ **Cloudinary integrado** (ou local)  

---

## 🔥 Melhorias implementadas:

1. ✅ Validação de SKU único
2. ✅ Boolean convertido corretamente
3. ✅ Notificação no CREATE e UPDATE
4. ✅ Soft delete por padrão
5. ✅ Hard delete separado
6. ✅ Include de imagens automático
7. ✅ Ordenação de imagens
8. ✅ Reordenação em batch
