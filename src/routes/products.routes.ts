import { Router, Request, Response } from 'express';
import { query, param, body } from 'express-validator';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';
import { validate } from '../utils/validate';
import { AppError } from '../middlewares/error.middleware';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary';
import fs from 'fs/promises';

const router = Router();

// Todas as rotas precisam de autenticação
router.use(authMiddleware);

// GET /api/products - Listar produtos
router.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().isString(),
    query('search').optional().isString(),
    query('featured').optional().isBoolean(),
    query('active').optional().isBoolean(),
    query('sortBy').optional().isIn(['createdAt', 'price', 'sales', 'title']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ]),
  async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const featured = req.query.featured === 'true' ? true : undefined;
    const active = req.query.active === 'false' ? false : true; // Por padrão apenas ativos
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    const skip = (page - 1) * limit;

    // Construir filtros
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

    res.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  }
);

// GET /api/products/:id - Detalhes do produto
router.get(
  '/:id',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
  ]),
  async (req: AuthRequest, res: Response) => {
    const now = new Date();

    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
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

    res.json(product);
  }
);

// POST /api/products - Criar produto
router.post(
  '/',
  validate([
    body('title').notEmpty().withMessage('Título obrigatório'),
    body('price').isFloat({ min: 0 }).withMessage('Preço inválido'),
    body('stock').optional().isInt({ min: 0 }),
    body('category').optional().isString(),
    body('description').optional().isString(),
  ]),
  async (req: AuthRequest, res: Response) => {
    const {
      title,
      description,
      price,
      comparePrice,
      stock,
      category,
      tags,
      type,
      condition,
      featured,
      sku,
      weight,
      dimensions,
    } = req.body;

    // Validar SKU único se fornecido
    if (sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku },
      });
      if (existingSku) {
        throw new AppError('SKU já cadastrado', 400);
      }
    }

    const product = await prisma.product.create({
      data: {
        title,
        description,
        price: parseFloat(price),
        comparePrice: comparePrice ? parseFloat(comparePrice) : null,
        stock: stock ? parseInt(stock) : 0,
        category,
        tags: tags || [],
        type: type || 'PHYSICAL',
        condition: condition || 'NEW',
        featured: Boolean(featured),
        sku,
        weight: weight ? parseFloat(weight) : null,
        dimensions,
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
          userId: req.userId!,
          type: 'LOW_STOCK',
          title: 'Estoque baixo',
          message: `${product.title} criado com apenas ${product.stock} unidades`,
          data: { productId: product.id },
        },
      });
    }

    res.status(201).json(product);
  }
);

// PUT /api/products/:id - Atualizar produto
router.put(
  '/:id',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
    body('title').optional().notEmpty(),
    body('price').optional().isFloat({ min: 0 }),
    body('stock').optional().isInt({ min: 0 }),
  ]),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const {
      title,
      description,
      price,
      comparePrice,
      stock,
      category,
      tags,
      featured,
      active,
      sku,
      weight,
      dimensions,
    } = req.body;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    // Validar SKU único se estiver mudando
    if (sku && sku !== product.sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku },
      });
      if (existingSku) {
        throw new AppError('SKU já cadastrado', 400);
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(price && { price: parseFloat(price) }),
        ...(comparePrice !== undefined && { comparePrice: comparePrice ? parseFloat(comparePrice) : null }),
        ...(stock !== undefined && { stock: parseInt(stock) }),
        ...(category !== undefined && { category }),
        ...(tags && { tags }),
        ...(featured !== undefined && { featured: Boolean(featured) }),
        ...(active !== undefined && { active: Boolean(active) }),
        ...(sku !== undefined && { sku }),
        ...(weight !== undefined && { weight: weight ? parseFloat(weight) : null }),
        ...(dimensions !== undefined && { dimensions }),
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
          userId: req.userId!,
          type: 'LOW_STOCK',
          title: 'Estoque baixo',
          message: `${updatedProduct.title} tem apenas ${updatedProduct.stock} unidades`,
          data: { productId: updatedProduct.id },
        },
      });
    }

    res.json(updatedProduct);
  }
);

// DELETE /api/products/:id - Soft delete (desativar produto)
router.delete(
  '/:id',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
  ]),
  async (req: AuthRequest, res: Response) => {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
    });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    // Soft delete - apenas desativa
    const updatedProduct = await prisma.product.update({
      where: { id: req.params.id },
      data: { active: false },
    });

    res.json({ 
      message: 'Produto desativado com sucesso',
      product: updatedProduct,
    });
  }
);

// DELETE /api/products/:id/permanent - Hard delete (deletar permanentemente)
router.delete(
  '/:id/permanent',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
  ]),
  async (req: AuthRequest, res: Response) => {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
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
      where: { id: req.params.id },
    });

    res.json({ message: 'Produto deletado permanentemente' });
  }
);

export default router;
