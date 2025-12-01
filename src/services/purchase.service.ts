import prisma from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';

export class PurchaseService {
  // Listar produtos comprados por email
  async getCustomerPurchases(email: string) {
    const purchases = await prisma.purchaseHistory.findMany({
      where: { customerEmail: email },
      orderBy: { purchasedAt: 'desc' },
    });

    // Buscar produtos únicos
    const productIds = [...new Set(purchases.map((p: any) => p.productId))];

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        images: {
          where: { order: 0 },
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

    return {
      email,
      purchases: purchasesWithProducts,
      totalPurchases: purchases.length,
    };
  }

  // Verificar se email comprou produto específico
  async verifyPurchase(email: string, productId: string) {
    const purchase = await prisma.purchaseHistory.findFirst({
      where: {
        customerEmail: email,
        productId,
      },
    });

    return {
      hasPurchased: !!purchase,
      purchase: purchase || null,
    };
  }

  // Criar registro de compra
  async createPurchase(data: {
    orderId: string;
    customerEmail: string;
    customerName: string;
    productId: string;
    productTitle: string;
    pricePaid: number;
  }) {
    return await prisma.purchaseHistory.create({
      data,
    });
  }
}

export default new PurchaseService();
