import prisma from '../lib/prisma';

class ReviewsService {
  async create(data: {
    productId: string;
    customerId?: string;
    customerName: string;
    customerEmail: string;
    rating: number;
    comment?: string;
    verified?: boolean;
  }) {
    // Verificar se produto existe
    const product = await prisma.product.findUnique({
      where: { id: data.productId }
    });

    if (!product) {
      throw new Error('Produto não encontrado');
    }

    // Verificar se cliente já avaliou este produto
    if (data.customerId) {
      const existingReview = await prisma.review.findFirst({
        where: {
          productId: data.productId,
          customerId: data.customerId
        }
      });

      if (existingReview) {
        throw new Error('Você já avaliou este produto');
      }
    }

    return await prisma.review.create({
      data: {
        productId: data.productId,
        customerId: data.customerId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        rating: data.rating,
        comment: data.comment,
        verified: data.verified || false
      },
      include: {
        customer: {
          select: {
            name: true,
            avatar: true
          }
        }
      }
    });
  }

  async getByProduct(productId: string) {
    const reviews = await prisma.review.findMany({
      where: { productId },
      include: {
        customer: {
          select: {
            name: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const stats = await prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true }
    });

    const ratingDistribution = await prisma.$transaction([
      prisma.review.count({ where: { productId, rating: 5 } }),
      prisma.review.count({ where: { productId, rating: 4 } }),
      prisma.review.count({ where: { productId, rating: 3 } }),
      prisma.review.count({ where: { productId, rating: 2 } }),
      prisma.review.count({ where: { productId, rating: 1 } })
    ]);

    return {
      reviews,
      stats: {
        average: stats._avg.rating || 0,
        total: stats._count.rating,
        distribution: {
          5: ratingDistribution[0],
          4: ratingDistribution[1],
          3: ratingDistribution[2],
          2: ratingDistribution[3],
          1: ratingDistribution[4]
        }
      }
    };
  }

  async update(id: string, data: { rating?: number; comment?: string }) {
    // Verificar se review existe
    const review = await prisma.review.findUnique({
      where: { id }
    });

    if (!review) {
      throw new Error('Avaliação não encontrada');
    }

    return await prisma.review.update({
      where: { id },
      data
    });
  }

  async delete(id: string) {
    // Verificar se review existe
    const review = await prisma.review.findUnique({
      where: { id }
    });

    if (!review) {
      throw new Error('Avaliação não encontrada');
    }

    return await prisma.review.delete({
      where: { id }
    });
  }

  async list(filters?: { verified?: boolean; rating?: number }) {
    return await prisma.review.findMany({
      where: filters,
      include: {
        product: {
          select: {
            id: true,
            title: true,
            images: {
              take: 1,
              orderBy: { order: 'asc' }
            }
          }
        },
        customer: {
          select: {
            name: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}

export default new ReviewsService();
