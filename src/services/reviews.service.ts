import { Prisma, NotificationType } from '@prisma/client';
import prisma from '../lib/prisma';
import notificationsService from './notifications.service';

class ReviewsService {
  async create(data: {
    productId: string;
    customerId?: string;
    customerName?: string;
    customerEmail?: string;
    rating: number;
    comment?: string;
  }) {
    // Verificar se produto existe
    const product = await prisma.product.findUnique({
      where: { id: data.productId }
    });

    if (!product) {
      throw new Error('Produto não encontrado');
    }

    let resolvedCustomerId = data.customerId;
    let resolvedCustomerName = data.customerName;
    let resolvedCustomerEmail = data.customerEmail?.trim();

    if (resolvedCustomerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: resolvedCustomerId }
      });

      if (!customer) {
        throw new Error('Cliente não encontrado');
      }

      resolvedCustomerName = customer.name;
      resolvedCustomerEmail = customer.email;
    }

    if (!resolvedCustomerEmail) {
      throw new Error('Email do cliente é obrigatório para criar a avaliação');
    }

    // Impede avaliações de quem não comprou o produto
    const purchaseRecord = await prisma.purchaseHistory.findFirst({
      where: {
        productId: data.productId,
        customerEmail: {
          equals: resolvedCustomerEmail,
          mode: 'insensitive'
        }
      }
    });

    if (!purchaseRecord) {
      throw new Error('Apenas clientes que compraram este produto podem avaliá-lo');
    }

    const duplicateConditions: Prisma.ReviewWhereInput[] = [];

    if (resolvedCustomerId) {
      duplicateConditions.push({ customerId: resolvedCustomerId });
    }

    duplicateConditions.push({
      customerEmail: {
        equals: resolvedCustomerEmail,
        mode: 'insensitive'
      }
    });

    const duplicateReview = await prisma.review.findFirst({
      where: {
        productId: data.productId,
        OR: duplicateConditions
      }
    });

    if (duplicateReview) {
      throw new Error('Você já avaliou este produto');
    }

    const review = await prisma.review.create({
      data: {
        productId: data.productId,
        customerId: resolvedCustomerId,
        customerName: resolvedCustomerName || purchaseRecord.customerName,
        customerEmail: resolvedCustomerEmail,
        rating: data.rating,
        comment: data.comment,
        verified: true
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

    await notificationsService.notifyAdmins({
      type: NotificationType.REVIEW,
      title: `Nova avaliação em ${product.title}`,
      message: `${review.customerName} avaliou este produto com ${review.rating} estrela(s).`,
      data: {
        reviewId: review.id,
        productId: product.id,
        rating: review.rating,
      },
    });

    return review;
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

    const product = await prisma.product.findUnique({
      where: { id: review.productId },
      select: { title: true },
    });

    const updatedReview = await prisma.review.update({
      where: { id },
      data
    });

    await notificationsService.notifyAdmins({
      type: NotificationType.REVIEW,
      title: `Avaliação atualizada${product?.title ? ` em ${product.title}` : ''}`,
      message: `${review.customerName} teve sua avaliação revisada.`,
      data: {
        reviewId: updatedReview.id,
        productId: review.productId,
        rating: data.rating ?? updatedReview.rating,
      },
    });

    return updatedReview;
  }

  async getCustomerReview(productId: string, customerId: string) {
    return prisma.review.findFirst({
      where: {
        productId,
        customerId
      }
    });
  }

  async updateCustomerReview(productId: string, customerId: string, data: { rating?: number; comment?: string }) {
    const review = await prisma.review.findFirst({
      where: {
        productId,
        customerId
      }
    });

    if (!review) {
      throw new Error('Avaliação não encontrada');
    }

    const product = await prisma.product.findUnique({
      where: { id: review.productId },
      select: { title: true },
    });

    const updated = await prisma.review.update({
      where: { id: review.id },
      data
    });

    await notificationsService.notifyAdmins({
      type: NotificationType.REVIEW,
      title: `Cliente editou a avaliação${product?.title ? ` de ${product.title}` : ''}`,
      message: `${review.customerName} ajustou a avaliação deste produto.`,
      data: {
        reviewId: updated.id,
        productId: review.productId,
        rating: data.rating ?? updated.rating,
      },
    });

    return updated;
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
