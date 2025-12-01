# 🖼️ Sistema de Upload de Imagens de Produtos

## 📁 Estrutura de Pastas

Cada produto tem sua própria pasta para organizar as imagens:

```
uploads/
└── products/
    ├── {productId-1}/
    │   ├── 1732991234567-123456789.png
    │   ├── 1732991235678-987654321.jpg
    │   └── 1732991236789-456789123.webp
    ├── {productId-2}/
    │   ├── 1732991237890-789123456.png
    │   └── 1732991238901-321654987.jpg
    └── {productId-3}/
        └── 1732991239012-654987321.png
```

## 🔧 Configuração

### 1. Variáveis de Ambiente (.env)

```env
# Cloudinary (opcional - para usar armazenamento em nuvem)
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret

# Se não configurar Cloudinary, as imagens ficam em /uploads/products/
```

### 2. Middleware de Upload

- **Formatos aceitos**: JPEG, JPG, PNG, WebP
- **Tamanho máximo**: 5MB por imagem
- **Pasta automática**: Cria `uploads/products/{productId}` automaticamente

## 📡 Endpoints da API

### 1. Upload de Imagem Única

```http
POST /api/products/:productId/images
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body (form-data):
- image: [arquivo]
- alt: "Texto alternativo" (opcional)
- order: 0 (opcional)
```

**Exemplo com cURL:**
```bash
curl -X POST http://localhost:3333/api/products/UUID-DO-PRODUTO/images \
  -H "Authorization: Bearer SEU_TOKEN" \
  -F "image=@caminho/para/imagem.png" \
  -F "alt=Foto do produto"
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-da-imagem",
    "productId": "uuid-do-produto",
    "url": "/uploads/products/uuid-do-produto/1732991234567-123456789.png",
    "alt": "Foto do produto",
    "order": 0,
    "createdAt": "2025-11-30T12:00:00.000Z",
    "updatedAt": "2025-11-30T12:00:00.000Z"
  }
}
```

### 2. Upload Múltiplo (até 10 imagens)

```http
POST /api/products/:productId/images/bulk
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body (form-data):
- images: [arquivo1]
- images: [arquivo2]
- images: [arquivo3]
```

**Exemplo com cURL:**
```bash
curl -X POST http://localhost:3333/api/products/UUID-DO-PRODUTO/images/bulk \
  -H "Authorization: Bearer SEU_TOKEN" \
  -F "images=@imagem1.png" \
  -F "images=@imagem2.jpg" \
  -F "images=@imagem3.webp"
```

### 3. Listar Imagens do Produto

```http
GET /api/products/:productId/images
Authorization: Bearer {token}
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "productId": "uuid-produto",
      "url": "/uploads/products/uuid-produto/imagem1.png",
      "alt": "Produto vista frontal",
      "order": 0
    },
    {
      "id": "uuid-2",
      "productId": "uuid-produto",
      "url": "/uploads/products/uuid-produto/imagem2.jpg",
      "alt": "Produto vista lateral",
      "order": 1
    }
  ]
}
```

### 4. Atualizar Imagem

```http
PUT /api/products/:productId/images/:imageId
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "alt": "Novo texto alternativo",
  "order": 2
}
```

### 5. Deletar Imagem

```http
DELETE /api/products/:productId/images/:imageId
Authorization: Bearer {token}
```

### 6. Reordenar Imagens

```http
PUT /api/products/:productId/images/reorder
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "imageIds": ["uuid-3", "uuid-1", "uuid-2"]
}
```

## 🎨 Usando no Frontend

### 1. Upload de Imagem Única (React)

```jsx
import { useState } from 'react';

function ProductImageUpload({ productId, token }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('alt', 'Foto do produto');

    try {
      const response = await fetch(
        `http://localhost:3333/api/products/${productId}/images`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      const data = await response.json();
      
      if (data.success) {
        console.log('Upload realizado:', data.data);
        alert('Imagem enviada com sucesso!');
      }
    } catch (error) {
      console.error('Erro no upload:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={(e) => setSelectedFile(e.target.files[0])}
      />
      <button onClick={handleUpload} disabled={uploading || !selectedFile}>
        {uploading ? 'Enviando...' : 'Enviar Imagem'}
      </button>
    </div>
  );
}
```

### 2. Upload Múltiplo (React)

```jsx
function MultipleImageUpload({ productId, token }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('images', file);
    });

    try {
      const response = await fetch(
        `http://localhost:3333/api/products/${productId}/images/bulk`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      const data = await response.json();
      
      if (data.success) {
        console.log(`${data.data.length} imagens enviadas`);
        alert('Imagens enviadas com sucesso!');
      }
    } catch (error) {
      console.error('Erro no upload:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
      />
      <p>{selectedFiles.length} arquivo(s) selecionado(s)</p>
      <button onClick={handleUpload} disabled={uploading || selectedFiles.length === 0}>
        {uploading ? 'Enviando...' : `Enviar ${selectedFiles.length} Imagem(ns)`}
      </button>
    </div>
  );
}
```

### 3. Exibir Imagens (React)

```jsx
import { useState, useEffect } from 'react';

function ProductImages({ productId, token }) {
  const [images, setImages] = useState([]);

  useEffect(() => {
    fetchImages();
  }, [productId]);

  const fetchImages = async () => {
    try {
      const response = await fetch(
        `http://localhost:3333/api/products/${productId}/images`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        setImages(data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar imagens:', error);
    }
  };

  const deleteImage = async (imageId) => {
    if (!confirm('Deseja deletar esta imagem?')) return;

    try {
      const response = await fetch(
        `http://localhost:3333/api/products/${productId}/images/${imageId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        setImages(images.filter(img => img.id !== imageId));
        alert('Imagem deletada!');
      }
    } catch (error) {
      console.error('Erro ao deletar:', error);
    }
  };

  return (
    <div>
      <h3>Imagens do Produto ({images.length})</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        {images.map(image => (
          <div key={image.id} style={{ position: 'relative' }}>
            <img
              src={`http://localhost:3333${image.url}`}
              alt={image.alt}
              style={{ width: '100%', height: '200px', objectFit: 'cover' }}
            />
            <button
              onClick={() => deleteImage(image.id)}
              style={{ position: 'absolute', top: 5, right: 5 }}
            >
              ❌
            </button>
            <p style={{ fontSize: '12px', margin: '5px 0' }}>
              Ordem: {image.order}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 🧪 Testando o Sistema

### 1. Instalar dependência para teste

```bash
npm install form-data
```

### 2. Executar script de teste

```bash
node test-image-upload.js
```

O script vai:
- ✅ Criar uma imagem de teste
- ✅ Fazer upload único
- ✅ Verificar pasta criada
- ✅ Fazer upload múltiplo
- ✅ Listar todas as imagens

## 📊 Estrutura do Banco de Dados

```prisma
model ProductImage {
  id        String   @id @default(uuid())
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  url       String   // URL da imagem
  alt       String?  // Texto alternativo
  order     Int      @default(0) // Ordem de exibição
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("product_images")
  @@index([productId])
  @@index([productId, order])
}
```

## ⚠️ Importante

1. **Autenticação**: Todas as rotas requerem token JWT válido
2. **Validação**: Apenas JPEG, JPG, PNG e WebP são aceitos
3. **Tamanho**: Máximo 5MB por imagem
4. **Ordem**: Se não informada, é atribuída automaticamente (sequencial)
5. **Cloudinary**: Se configurado, usa armazenamento em nuvem; senão, salva localmente
6. **Cascade Delete**: Ao deletar um produto, todas as imagens são deletadas automaticamente
7. **URL Absoluta**: No frontend, use: `http://localhost:3333${image.url}`

## 🚀 Melhorias Futuras

- [ ] Redimensionamento automático de imagens
- [ ] Geração de thumbnails
- [ ] Compressão automática
- [ ] Suporte a mais formatos (AVIF, etc)
- [ ] Drag & drop para reordenar
- [ ] Preview antes do upload
- [ ] Barra de progresso do upload
- [ ] Validação de dimensões mínimas/máximas
