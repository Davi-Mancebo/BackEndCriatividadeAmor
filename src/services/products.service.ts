import prisma from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import { deleteFromCloudinary } from '../utils/cloudinary';

interface ProductFilters {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  featured?: boolean;
  active?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface CreateProductData {
  title: string;
  description?: string;
  price: number;
  comparePrice?: number;
  stock?: number;
  category?: string;
  tags?: string[];
  type?: string;
  condition?: string;
  featured?: boolean;
  sku?: string;
  weight?: number;
  dimensions?: any;
}

interface UpdateProductData {
  title?: string;
  description?: string;
  price?: number;
  comparePrice?: number;
  stock?: number;
  category?: string;
  tags?: string[];
  featured?: boolean;
  active?: boolean;
  sku?: string;
  weight?: number;
  dimensions?: any;
}

class ProductsService {
  async list(filters: ProductFilters) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const category = filters.category;
    const search = filters.search;
    const featured = filters.featured;
    const active = filters.active !== false ? true : false;
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';

    const skip = (page - 1) * limit;

    const where: any = { active };

    if (category) {
      where.category = category;
    }

    if (featured !== undefined) {
      where.featured = featured;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } },
      ];
    }

    const now = new Date();

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          images: {
            orderBy: { order: 'asc' },
          },
          promotions: {
            where: {
              active: true,
              startDate: { lte: now },
              endDate: { gte: now },
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getById(productId: string) {
    const now = new Date();

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
        promotions: {
          where: {
            active: true,
            startDate: { lte: now },
            endDate: { gte: now },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    return product;
  }

  async create(data: CreateProductData, userId: string) {
    // Validar SKU único se fornecido
    if (data.sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku: data.sku },
      });
      if (existingSku) {
        throw new AppError('SKU já cadastrado', 400);
      }
    }

    const product = await prisma.product.create({
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        comparePrice: data.comparePrice || null,
        stock: data.stock || 0,
        category: data.category,
        tags: data.tags || [],
        type: (data.type as any) || 'PHYSICAL',
        condition: (data.condition as any) || 'NEW',
        featured: Boolean(data.featured),
        sku: data.sku,
        weight: data.weight || null,
        dimensions: data.dimensions,
      },
      include: {
        images: true,
        promotions: {
          where: {
            active: true,
            startDate: { lte: new Date() },
            endDate: { gte: new Date() },
          },
        },
      },
    });

    // Verificar estoque baixo
    if (product.stock <= 5 && product.stock > 0) {
      await prisma.notification.create({
        data: {
          userId,
          type: 'LOW_STOCK',
          title: 'Estoque baixo',
          message: `${product.title} criado com apenas ${product.stock} unidades`,
          data: { productId: product.id },
        },
      });
    }

    return product;
  }

  async update(productId: string, data: UpdateProductData, userId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    // Validar SKU único se estiver mudando
    if (data.sku && data.sku !== product.sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku: data.sku },
      });
      if (existingSku) {
        throw new AppError('SKU já cadastrado', 400);
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price && { price: data.price }),
        ...(data.comparePrice !== undefined && { comparePrice: data.comparePrice || null }),
        ...(data.stock !== undefined && { stock: data.stock }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.tags && { tags: data.tags }),
        ...(data.featured !== undefined && { featured: Boolean(data.featured) }),
        ...(data.active !== undefined && { active: Boolean(data.active) }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.weight !== undefined && { weight: data.weight || null }),
        ...(data.dimensions !== undefined && { dimensions: data.dimensions }),
      },
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
      },
    });

    // Verificar estoque baixo
    if (updatedProduct.stock <= 5 && updatedProduct.stock > 0) {
      await prisma.notification.create({
        data: {
          userId,
          type: 'LOW_STOCK',
          title: 'Estoque baixo',
          message: `${updatedProduct.title} tem apenas ${updatedProduct.stock} unidades`,
          data: { productId: updatedProduct.id },
        },
      });
    }

    return updatedProduct;
  }

  async delete(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    // Soft delete - apenas desativa
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { active: false },
    });

    return {
      message: 'Produto desativado com sucesso',
      product: updatedProduct,
    };
  }

  async permanentDelete(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { images: true },
    });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    // Deletar todas as imagens do Cloudinary
    if (product.images.length > 0) {
      await Promise.all(
        product.images.map((img: any) => {
          if (img.url.includes('cloudinary')) {
            return deleteFromCloudinary(img.url);
          }
          return Promise.resolve();
        })
      );
    }

    // Deletar produto (cascade vai deletar as imagens do banco)
    await prisma.product.delete({
      where: { id: productId },
    });

    return { message: 'Produto deletado permanentemente' };
  }
}

export default new ProductsService();
