import { Router, Response } from 'express';
import { param, body } from 'express-validator';
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

// POST /api/products/:productId/images - Adicionar imagem ao produto
router.post(
  '/:productId/images',
  upload.single('image'),
  validate([
    param('productId').isUUID().withMessage('ID do produto inválido'),
    body('alt').optional().isString(),
    body('order').optional().toInt().isInt({ min: 0 }),
  ]),
  async (req: AuthRequest, res: Response) => {
    const { productId } = req.params;
    const { alt, order } = req.body;

    // Verificar se produto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    if (!req.file) {
      throw new AppError('Nenhuma imagem enviada', 400);
    }

    try {
      let imageUrl: string;

      // Upload para Cloudinary ou local
      if (process.env.CLOUDINARY_CLOUD_NAME) {
        imageUrl = await uploadToCloudinary(req.file.path, 'products');
        await fs.unlink(req.file.path);
      } else {
        imageUrl = `/uploads/${req.file.filename}`;
      }

      // Se order não foi fornecido, pegar o próximo número
      let imageOrder = order ? parseInt(order) : 0;
      
      if (!order) {
        const lastImage = await prisma.productImage.findFirst({
          where: { productId },
          orderBy: { order: 'desc' },
        });
        imageOrder = lastImage ? lastImage.order + 1 : 0;
      }

      // Criar registro da imagem
      const productImage = await prisma.productImage.create({
        data: {
          productId,
          url: imageUrl,
          alt: alt || product.title,
          order: imageOrder,
        },
      });

      res.status(201).json(productImage);
    } catch (error) {
      // Limpar arquivo em caso de erro
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      throw error;
    }
  }
);

// GET /api/products/:productId/images - Listar imagens do produto
router.get(
  '/:productId/images',
  validate([
    param('productId').isUUID().withMessage('ID do produto inválido'),
  ]),
  async (req: AuthRequest, res: Response) => {
    const { productId } = req.params;

    const images = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { order: 'asc' },
    });

    res.json(images);
  }
);

// PUT /api/products/:productId/images/:imageId - Atualizar imagem
router.put(
  '/:productId/images/:imageId',
  validate([
    param('productId').isUUID(),
    param('imageId').isUUID(),
    body('alt').optional().isString(),
    body('order').optional().toInt().isInt({ min: 0 }),
  ]),
  async (req: AuthRequest, res: Response) => {
    const { productId, imageId } = req.params;
    const { alt, order } = req.body;

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
        ...(alt !== undefined && { alt }),
        ...(order !== undefined && { order: parseInt(order) }),
      },
    });

    res.json(updatedImage);
  }
);

// DELETE /api/products/:productId/images/:imageId - Deletar imagem
router.delete(
  '/:productId/images/:imageId',
  validate([
    param('productId').isUUID(),
    param('imageId').isUUID(),
  ]),
  async (req: AuthRequest, res: Response) => {
    const { productId, imageId } = req.params;

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

    res.json({ message: 'Imagem deletada com sucesso' });
  }
);

// PUT /api/products/:productId/images/reorder - Reordenar imagens
router.put(
  '/:productId/images/reorder',
  validate([
    param('productId').isUUID(),
    body('imageIds').isArray().withMessage('imageIds deve ser um array'),
  ]),
  async (req: AuthRequest, res: Response) => {
    const { productId } = req.params;
    const { imageIds } = req.body as { imageIds: string[] };

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

    res.json(updatedImages);
  }
);

export default router;
