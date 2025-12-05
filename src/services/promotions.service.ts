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

    // Validar percentual
    if (data.discountPercent && (data.discountPercent <= 0 || data.discountPercent > 100)) {
      throw new AppError('Desconto percentual deve ser entre 0 e 100', 400);
    }

    // Validar datas
    if (data.endDate <= data.startDate) {
      throw new AppError('Data de fim deve ser posterior à data de início', 400);
    }

    // Verificar se produto existe
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      select: { id: true, title: true, price: true },
    });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    // Verificar conflito de promoções ativas no mesmo período
    const conflictingPromotion = await prisma.promotion.findFirst({
      where: {
        productId: data.productId,
        active: true,
        OR: [
          {
            startDate: { lte: data.endDate },
            endDate: { gte: data.startDate },
          },
        ],
      },
    });

    if (conflictingPromotion) {
      throw new AppError(
        `Já existe uma promoção ativa para este produto no período selecionado (${new Date(conflictingPromotion.startDate).toLocaleDateString()} - ${new Date(conflictingPromotion.endDate).toLocaleDateString()})`,
        400
      );
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
            images: {
              where: { order: 0 },
              take: 1,
              select: { url: true, alt: true },
            },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    // Calcular preços finais
    const promotionsWithPrices = promotions.map(promo => {
      const product = promo.product;
      let finalPrice = product.price;

      if (promo.discountPercent) {
        finalPrice = product.price * (1 - promo.discountPercent / 100);
      } else if (promo.discountAmount) {
        finalPrice = Math.max(0, product.price - promo.discountAmount);
      }

      return {
        ...promo,
        product: {
          ...product,
          finalPrice: Math.round(finalPrice * 100) / 100,
          savings: Math.round((product.price - finalPrice) * 100) / 100,
        },
      };
    });

    return promotionsWithPrices;
  }

  async getById(promotionId: string) {
    const promotion = await prisma.promotion.findUnique({
      where: { id: promotionId },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            stock: true,
            category: true,
            featured: true,
            active: true,
            images: {
              orderBy: { order: 'asc' },
              select: { id: true, url: true, alt: true, order: true },
            },
          },
        },
      },
    });

    if (!promotion) {
      throw new AppError('Promoção não encontrada', 404);
    }

    // Calcular preço final
    const product = promotion.product;
    let finalPrice = product.price;

    if (promotion.discountPercent) {
      finalPrice = product.price * (1 - promotion.discountPercent / 100);
    } else if (promotion.discountAmount) {
      finalPrice = Math.max(0, product.price - promotion.discountAmount);
    }

    // Verificar se está ativa no momento atual
    const now = new Date();
    const isCurrentlyActive = 
      promotion.active && 
      promotion.startDate <= now && 
      promotion.endDate >= now;

    return {
      ...promotion,
      isCurrentlyActive,
      product: {
        ...product,
        finalPrice: Math.round(finalPrice * 100) / 100,
        savings: Math.round((product.price - finalPrice) * 100) / 100,
      },
    };
  }

  async update(promotionId: string, data: UpdatePromotionData) {
    const promotion = await prisma.promotion.findUnique({
      where: { id: promotionId },
    });

    if (!promotion) {
      throw new AppError('Promoção não encontrada', 404);
    }

    // Validar percentual se fornecido
    if (data.discountPercent !== undefined && (data.discountPercent <= 0 || data.discountPercent > 100)) {
      throw new AppError('Desconto percentual deve ser entre 0 e 100', 400);
    }

    // Validar datas se ambas forem fornecidas
    const startDate = data.startDate || promotion.startDate;
    const endDate = data.endDate || promotion.endDate;
    if (endDate <= startDate) {
      throw new AppError('Data de fim deve ser posterior à data de início', 400);
    }

    // Verificar conflito de promoções se as datas mudarem ou se reativar
    if (data.startDate || data.endDate || data.active === true) {
      const conflictingPromotion = await prisma.promotion.findFirst({
        where: {
          productId: promotion.productId,
          id: { not: promotionId },
          active: true,
          OR: [
            {
              startDate: { lte: endDate },
              endDate: { gte: startDate },
            },
          ],
        },
      });

      if (conflictingPromotion) {
        throw new AppError(
          `Conflito com promoção ativa existente no período`,
          400
        );
      }
    }

    // Preparar dados de atualização
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.startDate) updateData.startDate = data.startDate;
    if (data.endDate) updateData.endDate = data.endDate;
    if (data.active !== undefined) updateData.active = data.active;

    // Atualizar desconto apenas se fornecido
    if (data.discountPercent !== undefined) {
      updateData.discountPercent = data.discountPercent;
      updateData.discountAmount = null;
    } else if (data.discountAmount !== undefined) {
      updateData.discountAmount = data.discountAmount;
      updateData.discountPercent = null;
    }

    const updatedPromotion = await prisma.promotion.update({
      where: { id: promotionId },
      data: updateData,
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
