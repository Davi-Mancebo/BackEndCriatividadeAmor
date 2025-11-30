import { Router, Response } from 'express';
import { param, body } from 'express-validator';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { validate } from '../utils/validate';
import { AppError } from '../middlewares/error.middleware';

const router = Router();

// Todas as rotas precisam de autenticação
router.use(authMiddleware);

// Helper: Calcular preço final com promoção
async function calculatePromotionalPrice(productId: string, basePrice: number): Promise<number | null> {
  const now = new Date();
  
  const activePromotion = await prisma.promotion.findFirst({
    where: {
      productId,
      active: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    orderBy: {
      createdAt: 'desc', // Mais recente primeiro
    },
  });

  if (!activePromotion) return null;

  // Desconto percentual
  if (activePromotion.discountPercent) {
    return basePrice * (1 - activePromotion.discountPercent / 100);
  }

  // Desconto fixo
  if (activePromotion.discountAmount) {
    return Math.max(0, basePrice - activePromotion.discountAmount);
  }

  return null;
}

// POST /api/promotions - Criar promoção
router.post(
  '/',
  validate([
    body('productId').isUUID().withMessage('ID do produto inválido'),
    body('name').notEmpty().withMessage('Nome da promoção obrigatório'),
    body('startDate').isISO8601().withMessage('Data de início inválida'),
    body('endDate').isISO8601().withMessage('Data de fim inválida'),
    body('discountPercent').optional().isFloat({ min: 0, max: 100 }),
    body('discountAmount').optional().isFloat({ min: 0 }),
  ]),
  async (req: AuthRequest, res: Response) => {
    const { productId, name, discountPercent, discountAmount, startDate, endDate } = req.body;

    // Validar que tem pelo menos um tipo de desconto
    if (!discountPercent && !discountAmount) {
      throw new AppError('Informe discountPercent OU discountAmount', 400);
    }

    // Validar que tem apenas um tipo de desconto
    if (discountPercent && discountAmount) {
      throw new AppError('Informe apenas discountPercent OU discountAmount, não ambos', 400);
    }

    // Validar datas
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      throw new AppError('Data de fim deve ser posterior à data de início', 400);
    }

    // Verificar se produto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    const promotion = await prisma.promotion.create({
      data: {
        productId,
        name,
        discountPercent,
        discountAmount,
        startDate: start,
        endDate: end,
      },
    });

    // Calcular preço final
    const finalPrice = await calculatePromotionalPrice(productId, product.price);

    res.status(201).json({
      promotion,
      preview: {
        originalPrice: product.price,
        finalPrice,
        savings: finalPrice ? product.price - finalPrice : 0,
      },
    });
  }
);

// GET /api/promotions - Listar promoções
router.get('/', async (req: AuthRequest, res: Response) => {
  const { active, productId } = req.query;

  const where: any = {};

  if (active === 'true') {
    const now = new Date();
    where.active = true;
    where.startDate = { lte: now };
    where.endDate = { gte: now };
  }

  if (productId) {
    where.productId = productId;
  }

  const promotions = await prisma.promotion.findMany({
    where,
    include: {
      product: {
        select: {
          id: true,
          title: true,
          price: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(promotions);
});

// GET /api/promotions/:id - Detalhes da promoção
router.get(
  '/:id',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
  ]),
  async (req: AuthRequest, res: Response) => {
    const promotion = await prisma.promotion.findUnique({
      where: { id: req.params.id },
      include: {
        product: true,
      },
    });

    if (!promotion) {
      throw new AppError('Promoção não encontrada', 404);
    }

    res.json(promotion);
  }
);

// PUT /api/promotions/:id - Atualizar promoção
router.put(
  '/:id',
  validate([
    param('id').isUUID(),
    body('name').optional().notEmpty(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('active').optional().isBoolean(),
  ]),
  async (req: AuthRequest, res: Response) => {
    const { name, startDate, endDate, active, discountPercent, discountAmount } = req.body;

    const promotion = await prisma.promotion.findUnique({
      where: { id: req.params.id },
    });

    if (!promotion) {
      throw new AppError('Promoção não encontrada', 404);
    }

    const updatedPromotion = await prisma.promotion.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(active !== undefined && { active }),
        ...(discountPercent !== undefined && { discountPercent, discountAmount: null }),
        ...(discountAmount !== undefined && { discountAmount, discountPercent: null }),
      },
    });

    res.json(updatedPromotion);
  }
);

// DELETE /api/promotions/:id - Deletar promoção
router.delete(
  '/:id',
  validate([
    param('id').isUUID(),
  ]),
  async (req: AuthRequest, res: Response) => {
    const promotion = await prisma.promotion.findUnique({
      where: { id: req.params.id },
    });

    if (!promotion) {
      throw new AppError('Promoção não encontrada', 404);
    }

    await prisma.promotion.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Promoção deletada com sucesso' });
  }
);

// GET /api/promotions/product/:productId/active - Promoção ativa do produto
router.get(
  '/product/:productId/active',
  validate([
    param('productId').isUUID(),
  ]),
  async (req: AuthRequest, res: Response) => {
    const { productId } = req.params;
    const now = new Date();

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    const activePromotion = await prisma.promotion.findFirst({
      where: {
        productId,
        active: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activePromotion) {
      return res.json({
        hasPromotion: false,
        product: {
          id: product.id,
          title: product.title,
          price: product.price,
          finalPrice: product.price,
        },
      });
    }

    const finalPrice = await calculatePromotionalPrice(productId, product.price);

    res.json({
      hasPromotion: true,
      promotion: activePromotion,
      product: {
        id: product.id,
        title: product.title,
        price: product.price,
        finalPrice: finalPrice || product.price,
        savings: finalPrice ? product.price - finalPrice : 0,
        discountPercent: activePromotion.discountPercent,
      },
    });
  }
);

export default router;
