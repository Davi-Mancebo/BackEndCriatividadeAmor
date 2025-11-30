import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import prisma from '../lib/prisma';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary';
import { validate } from '../utils/validate';
import { AppError } from '../middlewares/error.middleware';

const router = Router();

// ============================================
// ROTAS PÚBLICAS - Download com validação de compra
// ============================================

// GET /api/digital-files/download/:productId - Baixar arquivos (se comprou)
router.get(
  '/download/:productId',
  validate([
    param('productId').isUUID().withMessage('ID do produto inválido'),
  ]),
  async (req: AuthRequest, res: Response) => {
    const { productId } = req.params;
    const { email, orderId } = req.query;

    if (!email) {
      throw new AppError('Email obrigatório para download', 400);
    }

    // Verificar se o produto existe e é digital
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        digitalFiles: {
          where: { active: true },
        },
      },
    });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    if (product.type !== 'DIGITAL') {
      throw new AppError('Este produto não possui arquivos digitais', 400);
    }

    // Verificar se o cliente comprou este produto
    const purchase = await prisma.purchaseHistory.findFirst({
      where: {
        customerEmail: email as string,
        productId,
      },
    });

    if (!purchase) {
      throw new AppError('Você não comprou este produto', 403);
    }

    // Incrementar contador de downloads
    await prisma.digitalFile.updateMany({
      where: { productId },
      data: {
        downloadCount: {
          increment: 1,
        },
      },
    });

    res.json({
      product: {
        id: product.id,
        title: product.title,
      },
      purchase: {
        orderId: purchase.orderId,
        purchasedAt: purchase.purchasedAt,
      },
      files: product.digitalFiles.map(file => ({
        id: file.id,
        name: file.name,
        description: file.description,
        fileSize: file.fileSize,
        fileType: file.fileType,
        downloadUrl: file.fileUrl, // URL direta do Cloudinary/S3
      })),
      message: 'Clique no link para baixar seu arquivo',
    });
  }
);

// GET /api/digital-files/check/:productId - Verificar se tem acesso
router.get(
  '/check/:productId',
  validate([
    param('productId').isUUID().withMessage('ID do produto inválido'),
  ]),
  async (req: AuthRequest, res: Response) => {
    const { productId } = req.params;
    const { email } = req.query;

    if (!email) {
      throw new AppError('Email obrigatório', 400);
    }

    const purchase = await prisma.purchaseHistory.findFirst({
      where: {
        customerEmail: email as string,
        productId,
      },
    });

    res.json({
      hasAccess: !!purchase,
      purchase: purchase || null,
    });
  }
);

// ============================================
// ROTAS ADMIN - Gerenciar arquivos digitais
// ============================================

router.use(authMiddleware);
router.use(adminMiddleware);

// POST /api/digital-files/:productId - Adicionar arquivo digital
router.post(
  '/:productId',
  upload.single('file'),
  validate([
    param('productId').isUUID().withMessage('ID do produto inválido'),
    body('name').notEmpty().withMessage('Nome do arquivo obrigatório'),
  ]),
  async (req: AuthRequest, res: Response) => {
    const { productId } = req.params;
    const { name, description } = req.body;

    // Verificar se o produto existe e é digital
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    if (product.type !== 'DIGITAL') {
      throw new AppError('Apenas produtos digitais podem ter arquivos', 400);
    }

    if (!req.file) {
      throw new AppError('Arquivo obrigatório', 400);
    }

    // Upload para Cloudinary (ou pode usar S3)
    const uploadResult = await uploadToCloudinary(
      req.file.path,
      'digital-products',
      {
        resource_type: 'auto', // Aceita qualquer tipo de arquivo
        access_mode: 'authenticated', // Controle de acesso
      }
    );

    // Criar registro do arquivo
    const digitalFile = await prisma.digitalFile.create({
      data: {
        productId,
        name,
        description,
        fileUrl: uploadResult.secure_url,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
      },
    });

    res.status(201).json(digitalFile);
  }
);

// GET /api/digital-files/:productId - Listar arquivos de um produto
router.get(
  '/:productId',
  validate([
    param('productId').isUUID().withMessage('ID do produto inválido'),
  ]),
  async (req: AuthRequest, res: Response) => {
    const { productId } = req.params;

    const files = await prisma.digitalFile.findMany({
      where: { productId },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(files);
  }
);

// PUT /api/digital-files/:fileId - Atualizar arquivo
router.put(
  '/:fileId',
  validate([
    param('fileId').isUUID().withMessage('ID do arquivo inválido'),
  ]),
  async (req: AuthRequest, res: Response) => {
    const { fileId } = req.params;
    const { name, description, active } = req.body;

    const file = await prisma.digitalFile.update({
      where: { id: fileId },
      data: {
        name,
        description,
        active: Boolean(active),
      },
    });

    res.json(file);
  }
);

// DELETE /api/digital-files/:fileId - Deletar arquivo
router.delete(
  '/:fileId',
  validate([
    param('fileId').isUUID().withMessage('ID do arquivo inválido'),
  ]),
  async (req: AuthRequest, res: Response) => {
    const file = await prisma.digitalFile.findUnique({
      where: { id: req.params.fileId },
    });

    if (!file) {
      throw new AppError('Arquivo não encontrado', 404);
    }

    // Deletar do Cloudinary
    await deleteFromCloudinary(file.fileUrl);

    // Deletar do banco
    await prisma.digitalFile.delete({
      where: { id: req.params.fileId },
    });

    res.json({ message: 'Arquivo deletado com sucesso' });
  }
);

// GET /api/digital-files/stats - Estatísticas de downloads
router.get('/stats/overview', async (req: AuthRequest, res: Response) => {
  const [totalFiles, totalDownloads, filesByProduct] = await Promise.all([
    prisma.digitalFile.count({ where: { active: true } }),
    prisma.digitalFile.aggregate({
      _sum: { downloadCount: true },
    }),
    prisma.digitalFile.groupBy({
      by: ['productId'],
      _count: true,
      _sum: { downloadCount: true },
    }),
  ]);

  res.json({
    totalFiles,
    totalDownloads: totalDownloads._sum.downloadCount || 0,
    filesByProduct: filesByProduct.length,
  });
});

export default router;
