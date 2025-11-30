import { Router, Response } from 'express';
import { param } from 'express-validator';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { validate } from '../utils/validate';
import { AppError } from '../middlewares/error.middleware';

const router = Router();

// ============================================
// ROTAS PÚBLICAS - Cliente consulta suas compras
// ============================================

// GET /api/purchases/my-products - Listar produtos comprados pelo email
router.get('/my-products', async (req: AuthRequest, res: Response) => {
  const { email } = req.query;

  if (!email) {
    throw new AppError('Email obrigatório', 400);
  }

  const purchases = await prisma.purchaseHistory.findMany({
    where: {
      customerEmail: email as string,
    },
    orderBy: { purchasedAt: 'desc' },
  });

  // Buscar produtos e seus arquivos digitais
  const productIds = [...new Set(purchases.map((p: any) => p.productId))];

  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
    },
    include: {
      images: {
        where: { order: 0 }, // Apenas imagem principal
        take: 1,
      },
      digitalFiles: {
        where: { active: true },
        select: {
          id: true,
          name: true,
          description: true,
          fileSize: true,
          fileType: true,
        },
      },
    },
  });

  // Mapear compras com produtos
  const purchasesWithProducts = purchases.map((purchase: any) => {
    const product = products.find((p: any) => p.id === purchase.productId);
    return {
      ...purchase,
      product: product || null,
    };
  });

  res.json({
    email,
    purchases: purchasesWithProducts,
    totalPurchases: purchases.length,
  });
});

// GET /api/purchases/verify - Verificar se email comprou produto específico
router.get(
  '/verify',
  validate([]),
  async (req: AuthRequest, res: Response) => {
    const { email, productId } = req.query;

    if (!email || !productId) {
      throw new AppError('Email e productId obrigatórios', 400);
    }

    const purchase = await prisma.purchaseHistory.findFirst({
      where: {
        customerEmail: email as string,
        productId: productId as string,
      },
    });

    res.json({
      hasPurchased: !!purchase,
      purchase: purchase || null,
    });
  }
);

export default router;
