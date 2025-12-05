import prisma from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import emailService from './email.service';
import { BRAZIL_MOBILE_REGEX, formatBrazilianCellPhone } from '../utils/phone';

interface OrderFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface CreateOrderData {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: any;
  subtotal: number;
  shipping?: number;
  total: number;
  shippingAddress?: any;
}

interface UpdateOrderData {
  status?: string;
  trackingCode?: string;
  notes?: string;
}

class OrdersService {
  // Helper: Verificar se busca é numérica (valor)
  private isNumericSearch(search: string): boolean {
    // Remove vírgulas e espaços
    const cleaned = search.replace(/[,\s]/g, '');
    return /^\d+(\.\d{1,2})?$/.test(cleaned);
  }

  // Helper: Converter busca para valor monetário
  private parseSearchAmount(search: string): number | null {
    try {
      // Substituir vírgula por ponto e remover espaços
      const cleaned = search.replace(/,/g, '.').replace(/\s/g, '');
      const amount = parseFloat(cleaned);
      return isNaN(amount) ? null : amount;
    } catch {
      return null;
    }
  }

  // Helper: Verificar se busca é data (dd/mm ou dd/mm/yyyy)
  private isDateSearch(search: string): boolean {
    return /^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(search);
  }

  // Helper: Converter busca de data para Date
  private parseSearchDate(search: string): { start: Date; end: Date } | null {
    try {
      const parts = search.split('/');
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
      const year = parts[2] ? parseInt(parts[2]) : new Date().getFullYear();
      
      // Ajustar ano se for 2 dígitos (ex: 25 -> 2025)
      const fullYear = year < 100 ? 2000 + year : year;
      
      // Data início (00:00:00)
      const start = new Date(fullYear, month, day, 0, 0, 0, 0);
      // Data fim (23:59:59)
      const end = new Date(fullYear, month, day, 23, 59, 59, 999);
      
      return { start, end };
    } catch {
      return null;
    }
  }

  // Método auxiliar para transformar pedido no formato esperado pelo frontend
  private transformOrder(order: any) {
    // Transformar items para o formato esperado pelo frontend
    const orderItems = Array.isArray(order.items) 
      ? order.items.map((item: any) => ({
          id: item.productId,
          productId: item.productId,
          name: item.title || item.name,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
        }))
      : order.items;

    return {
      ...order,
      orderItems, // Frontend espera orderItems com campo 'name'
      totalAmount: order.total, // Frontend espera totalAmount (número)
      subtotalAmount: order.subtotal,
      shippingAmount: order.shipping,
      paymentStatus: order.payment?.status || order.paymentStatus || null,
      paymentMethod: order.payment?.method || order.paymentMethod || null,
      paymentPreferenceId: order.payment?.preferenceId || order.paymentPreferenceId || null,
    };
  }

  async list(filters: OrderFilters, userId: string) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const status = filters.status;
    const search = filters.search;
    const startDate = filters.startDate;
    const endDate = filters.endDate;
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';

    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {};

    if (status) {
      where.status = status;
    }

    // Busca multifield: ID, nome, email, tracking, valor, data
    if (search) {
      const searchConditions: any[] = [
        { id: { contains: search, mode: 'insensitive' } }, // ID parcial
        { orderNumber: { contains: search, mode: 'insensitive' } }, // Order number
        { customerName: { contains: search, mode: 'insensitive' } }, // Nome do cliente
        { customerEmail: { contains: search, mode: 'insensitive' } }, // Email do cliente
        { trackingCode: { contains: search, mode: 'insensitive' } }, // Código de rastreio
      ];

      // Busca por valor (ex: "34,00" ou "34")
      if (this.isNumericSearch(search)) {
        const amount = this.parseSearchAmount(search);
        if (amount !== null) {
          searchConditions.push({ total: amount });
          searchConditions.push({ subtotal: amount });
        }
      }

      // Busca por data (ex: "21/11" ou "21/11/2025")
      if (this.isDateSearch(search)) {
        const dateRange = this.parseSearchDate(search);
        if (dateRange) {
          searchConditions.push({
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
          });
        }
      }

      where.OR = searchConditions;
    }

    // Filtro de data
    if (startDate || endDate) {
      where.createdAt = {};
      
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Construir filtros para statusCounts (sem filtro de status específico)
    const whereForCounts: any = {};
    
    if (search) {
      whereForCounts.OR = where.OR;
    }
    
    if (startDate || endDate) {
      whereForCounts.createdAt = where.createdAt;
    }

    // Buscar pedidos + contadores por status em paralelo
    const [orders, total, statusCountsRaw] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          payment: true,
        },
      }),
      prisma.order.count({ where }),
      // Nova query: contar por status com os mesmos filtros de data/busca
      prisma.order.groupBy({
        by: ['status'],
        where: whereForCounts,
        _count: {
          status: true,
        },
      }),
    ]);

    // Transformar statusCounts em objeto
    const statusCounts: Record<string, number> = {
      PENDING: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
      PAID: 0,
      REFUNDED: 0,
    };

    statusCountsRaw.forEach((item: any) => {
      statusCounts[item.status] = item._count.status;
    });

    // Transformar pedidos para o formato esperado pelo frontend
    const transformedOrders = orders.map((order: any) => this.transformOrder(order));

    return {
      orders: transformedOrders,
      total, // Total de pedidos (filtrados)
      statusCounts, // Contadores por status (com filtros de data/busca aplicados)
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
      monthRevenue,
      lastMonthRevenue,
      recentOrders,
      statusCount,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'PROCESSING' } }),
      prisma.order.count({ where: { status: 'SHIPPED' } }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
      prisma.order.aggregate({
        where: {
          status: { notIn: ['CANCELLED'] },
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          createdAt: { gte: startOfMonth },
          status: { notIn: ['CANCELLED'] },
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
          status: { notIn: ['CANCELLED'] },
        },
        _sum: { total: true },
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    const currentRevenue = monthRevenue._sum.total || 0;
    const lastRevenue = lastMonthRevenue._sum.total || 0;
    const allTimeRevenue = totalRevenue._sum.total || 0;
    const revenueGrowth = lastRevenue > 0 
      ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 
      : 0;

    // Transformar pedidos recentes para incluir orderItems e totalAmount
    const transformedRecentOrders = recentOrders.map((order: any) => this.transformOrder(order));

    return {
      overview: {
        totalOrders,
        pendingOrders,
        monthRevenue: currentRevenue,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      },
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue: allTimeRevenue,
      monthRevenue: currentRevenue,
      recentOrders: transformedRecentOrders,
      statusDistribution: statusCount.map((item: any) => ({
        status: item.status,
        count: item._count,
      })),
    };
  }

  async getById(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
      },
    });

    if (!order) {
      throw new AppError('Pedido não encontrado', 404);
    }

    // Transformar para o formato esperado pelo frontend
    return this.transformOrder(order);
  }

  async create(data: CreateOrderData, userId?: string) {
    let normalizedPhone: string | null = null;

    if (data.customerPhone) {
      const formatted = formatBrazilianCellPhone(data.customerPhone);

      if (!formatted || !BRAZIL_MOBILE_REGEX.test(formatted)) {
        throw new AppError('Telefone do cliente inválido. Use o formato (XX) 9XXXX-XXXX', 400);
      }

      normalizedPhone = formatted;
    }

    const order = await prisma.order.create({
      data: {
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: normalizedPhone,
        items: data.items,
        subtotal: data.subtotal,
        shipping: data.shipping || 0,
        total: data.total,
        shippingAddress: data.shippingAddress,
        status: 'PENDING', // Always start as PENDING
      },
    });

    // Criar notificações para administradores
    const notificationPayload = {
      type: 'NEW_ORDER' as const,
      title: 'Novo pedido recebido',
      message: `Pedido #${order.orderNumber} de ${data.customerName}`,
      data: { orderId: order.id },
    };

    if (userId) {
      await prisma.notification.create({
        data: {
          userId,
          ...notificationPayload,
        },
      });
    } else {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      });

      if (admins.length === 0) {
        console.warn('[OrdersService] Nenhum admin encontrado para notificar novo pedido');
      } else {
        await prisma.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            ...notificationPayload,
          })),
        });
      }
    }

    if (order.customerEmail) {
      emailService
        .sendOrderConfirmation(order)
        .catch((error) => console.error('Erro ao enviar email de confirmação de pedido:', error));
    }

    // Transformar para o formato esperado pelo frontend
    return this.transformOrder(order);
  }

  async update(orderId: string, data: UpdateOrderData, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new AppError('Pedido não encontrado', 404);
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        ...(data.status && { status: data.status as any }),
        ...(data.trackingCode !== undefined && { trackingCode: data.trackingCode }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        payment: true,
      },
    });

    // Se admin marcou como DELIVERED, criar histórico de compra para liberar download
    if (data.status === 'DELIVERED' && order.status !== 'DELIVERED') {
      const items = updatedOrder.items as any[];
      const customerEmail = updatedOrder.customerEmail || order.payment?.payerEmail;
      
      if (customerEmail) {
        for (const item of items) {
          // Verificar se já não existe histórico para este produto
          const existingHistory = await prisma.purchaseHistory.findFirst({
            where: {
              orderId: updatedOrder.id,
              productId: item.productId,
              customerEmail,
            },
          });

          if (!existingHistory) {
            await prisma.purchaseHistory.create({
              data: {
                orderId: updatedOrder.id,
                customerEmail,
                customerName: updatedOrder.customerName,
                productId: item.productId,
                productTitle: item.title,
                pricePaid: item.price * item.quantity,
              },
            });
          }
        }

        // Enviar email de liberação de download
        emailService
          .sendPaymentConfirmation(updatedOrder)
          .catch((error) => console.error('Erro ao enviar email de liberação de download:', error));
      }
    }

    // Criar notificação se o status foi alterado
    if (data.status && data.status !== order.status) {
      await prisma.notification.create({
        data: {
          userId,
          type: 'ORDER_UPDATE',
          title: 'Pedido atualizado',
          message: `Pedido #${order.orderNumber} mudou de ${order.status} para ${data.status}`,
          data: { orderId: order.id },
        },
      });
    }

    // Transformar para o formato esperado pelo frontend
    return this.transformOrder(updatedOrder);
  }

  async delete(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppError('Pedido não encontrado', 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.purchaseHistory.deleteMany({ where: { orderId } });
      await tx.payment.deleteMany({ where: { orderId } });
      await tx.order.delete({ where: { id: orderId } });
    });

    return { success: true };
  }

  // ============================================
  // MÉTODOS PÚBLICOS (Cliente)
  // ============================================

  async trackOrder(orderId: string, email: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new AppError('Pedido não encontrado', 404);
    }

    // Verificar se o email corresponde ao pedido
    if (order.customerEmail?.toLowerCase() !== email.toLowerCase()) {
      throw new AppError('Email não corresponde ao pedido', 403);
    }

    // Retornar informações de rastreamento (dados limitados)
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      trackingCode: order.trackingCode,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      total: order.total,
      items: order.items,
    };
  }

  async getMyOrders(email: string, filters: { page: number; limit: number }) {
    const { page, limit } = filters;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: {
          customerEmail: {
            equals: email,
            mode: 'insensitive',
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          payment: true,
        },
      }),
      prisma.order.count({
        where: {
          customerEmail: {
            equals: email,
            mode: 'insensitive',
          },
        },
      }),
    ]);

    // Transformar pedidos para o formato esperado
    const transformedOrders = orders.map((order: any) => this.transformOrder(order));

    return {
      orders: transformedOrders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

export default new OrdersService();
