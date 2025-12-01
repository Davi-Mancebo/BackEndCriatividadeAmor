import prisma from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary';
import fs from 'fs/promises';

interface CreateImageData {
  productId: string;
  file: Express.Multer.File;
  alt?: string;
  order?: number;
}

interface UpdateImageData {
  alt?: string;
  order?: number;
}

class ProductImagesService {
  async create(data: CreateImageData) {
    // Verificar se produto existe
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    let imageUrl: string;

    // Upload para Cloudinary ou local
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      imageUrl = await uploadToCloudinary(data.file.path, 'products');
      await fs.unlink(data.file.path);
    } else {
      // Caminho relativo: /uploads/products/{productId}/{filename}
      imageUrl = `/uploads/products/${data.productId}/${data.file.filename}`;
    }

    // Se order não foi fornecido, pegar o próximo número
    let imageOrder = data.order || 0;
    
    if (!data.order) {
      const lastImage = await prisma.productImage.findFirst({
        where: { productId: data.productId },
        orderBy: { order: 'desc' },
      });
      imageOrder = lastImage ? lastImage.order + 1 : 0;
    }

    // Criar registro da imagem
    const productImage = await prisma.productImage.create({
      data: {
        productId: data.productId,
        url: imageUrl,
        alt: data.alt || `${product.title} - Imagem ${imageOrder + 1}`,
        order: imageOrder,
      },
    });

    return productImage;
  }

  async list(productId: string) {
    const images = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { order: 'asc' },
    });

    return images;
  }

  async update(productId: string, imageId: string, data: UpdateImageData) {
    const image = await prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId,
      },
    });

    if (!image) {
      throw new AppError('Imagem não encontrada', 404);
    }

    const updatedImage = await prisma.productImage.update({
      where: { id: imageId },
      data: {
        ...(data.alt !== undefined && { alt: data.alt }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });

    return updatedImage;
  }

  async delete(productId: string, imageId: string) {
    const image = await prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId,
      },
    });

    if (!image) {
      throw new AppError('Imagem não encontrada', 404);
    }

    // Deletar do Cloudinary se for URL do Cloudinary
    if (image.url.includes('cloudinary')) {
      await deleteFromCloudinary(image.url);
    }

    await prisma.productImage.delete({
      where: { id: imageId },
    });

    return { message: 'Imagem deletada com sucesso' };
  }

  async reorder(productId: string, imageIds: string[]) {
    // Verificar se todas as imagens pertencem ao produto
    const images = await prisma.productImage.findMany({
      where: {
        productId,
        id: { in: imageIds },
      },
    });

    if (images.length !== imageIds.length) {
      throw new AppError('Algumas imagens não pertencem a este produto', 400);
    }

    // Atualizar ordem de cada imagem
    await Promise.all(
      imageIds.map((id, index) =>
        prisma.productImage.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    const updatedImages = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { order: 'asc' },
    });

    return updatedImages;
  }

  async createBulk(productId: string, files: Express.Multer.File[], alts?: string[]) {
    // Verificar se produto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    // Pegar a última ordem existente
    const lastImage = await prisma.productImage.findFirst({
      where: { productId },
      orderBy: { order: 'desc' },
    });
    let currentOrder = lastImage ? lastImage.order + 1 : 0;

    // Processar cada arquivo individualmente
    const uploadedImages = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let imageUrl: string;

      try {
        // Upload para Cloudinary ou local
        if (process.env.CLOUDINARY_CLOUD_NAME) {
          imageUrl = await uploadToCloudinary(file.path, 'products');
          await fs.unlink(file.path);
        } else {
          // Caminho relativo: /uploads/products/{productId}/{filename}
          imageUrl = `/uploads/products/${productId}/${file.filename}`;
        }

        // Criar registro individual da imagem
        const productImage = await prisma.productImage.create({
          data: {
            productId,
            url: imageUrl,
            alt: alts?.[i] || product.title,
            order: currentOrder + i,
          },
        });

        uploadedImages.push(productImage);
      } catch (error) {
        // Se falhar, tentar limpar o arquivo local
        try {
          await fs.unlink(file.path);
        } catch {}
        
        console.error(`Erro ao fazer upload da imagem ${file.filename}:`, error);
        // Continua com as próximas imagens
      }
    }

    if (uploadedImages.length === 0) {
      throw new AppError('Nenhuma imagem foi enviada com sucesso', 400);
    }

    return uploadedImages;
  }
}

export default new ProductImagesService();
