import prisma from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';

interface CreatePromotionData {
  productId: string;
  name: string;
  discountPercent?: number;
  discountAmount?: number;
  startDate: Date;
  endDate: Date;
}

interface UpdatePromotionData {
  name?: string;
  startDate?: Date;
  endDate?: Date;
  active?: boolean;
  discountPercent?: number;
  discountAmount?: number;
}

interface PromotionFilters {
  active?: boolean;
  productId?: string;
}

class PromotionsService {
  async calculatePromotionalPrice(productId: string, basePrice: number): Promise<number | null> {
    const now = new Date();
    
    const activePromotion = await prisma.promotion.findFirst({
      where: {
        productId,
        active: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: {
        createdAt: 'desc',
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

  async create(data: CreatePromotionData) {
    // Validar que tem pelo menos um tipo de desconto
    if (!data.discountPercent && !data.discountAmount) {
      throw new AppError('Informe discountPercent OU discountAmount', 400);
    }

    // Validar que tem apenas um tipo de desconto
    if (data.discountPercent && data.discountAmount) {
      throw new AppError('Informe apenas discountPercent OU discountAmount, não ambos', 400);
    }

    // Validar datas
    if (data.endDate <= data.startDate) {
      throw new AppError('Data de fim deve ser posterior à data de início', 400);
    }

    // Verificar se produto existe
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    const promotion = await prisma.promotion.create({
      data: {
        productId: data.productId,
        name: data.name,
        discountPercent: data.discountPercent,
        discountAmount: data.discountAmount,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    });

    // Calcular preço final
    const finalPrice = await this.calculatePromotionalPrice(data.productId, product.price);

    return {
      promotion,
      preview: {
        originalPrice: product.price,
        finalPrice,
        savings: finalPrice ? product.price - finalPrice : 0,
      },
    };
  }

  async list(filters: PromotionFilters) {
    const where: any = {};

    if (filters.active) {
      const now = new Date();
      where.active = true;
      where.startDate = { lte: now };
      where.endDate = { gte: now };
    }

    if (filters.productId) {
      where.productId = filters.productId;
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

    return promotions;
  }

  async getById(promotionId: string) {
    const promotion = await prisma.promotion.findUnique({
      where: { id: promotionId },
      include: {
        product: true,
      },
    });

    if (!promotion) {
      throw new AppError('Promoção não encontrada', 404);
    }

    return promotion;
  }

  async update(promotionId: string, data: UpdatePromotionData) {
    const promotion = await prisma.promotion.findUnique({
      where: { id: promotionId },
    });

    if (!promotion) {
      throw new AppError('Promoção não encontrada', 404);
    }

    const updatedPromotion = await prisma.promotion.update({
      where: { id: promotionId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.startDate && { startDate: data.startDate }),
        ...(data.endDate && { endDate: data.endDate }),
        ...(data.active !== undefined && { active: data.active }),
        ...(data.discountPercent !== undefined && { discountPercent: data.discountPercent, discountAmount: null }),
        ...(data.discountAmount !== undefined && { discountAmount: data.discountAmount, discountPercent: null }),
      },
    });

    return updatedPromotion;
  }

  async delete(promotionId: string) {
    const promotion = await prisma.promotion.findUnique({
      where: { id: promotionId },
    });

    if (!promotion) {
      throw new AppError('Promoção não encontrada', 404);
    }

    await prisma.promotion.delete({
      where: { id: promotionId },
    });

    return { message: 'Promoção deletada com sucesso' };
  }

  async getActiveByProduct(productId: string) {
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
      return {
        hasPromotion: false,
        product: {
          id: product.id,
          title: product.title,
          price: product.price,
          finalPrice: product.price,
        },
      };
    }

    const finalPrice = await this.calculatePromotionalPrice(productId, product.price);

    return {
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
    };
  }
}

export default new PromotionsService();
