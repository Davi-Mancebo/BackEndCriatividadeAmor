import prisma from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';

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

    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { trackingCode: { contains: search, mode: 'insensitive' } },
      ];
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

    // Buscar pedidos
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.order.count({ where }),
    ]);

    // Transformar pedidos para o formato esperado pelo frontend
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
    });

    if (!order) {
      throw new AppError('Pedido não encontrado', 404);
    }

    // Transformar para o formato esperado pelo frontend
    return this.transformOrder(order);
  }

  async create(data: CreateOrderData, userId: string) {
    const order = await prisma.order.create({
      data: {
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        items: data.items,
        subtotal: data.subtotal,
        shipping: data.shipping || 0,
        total: data.total,
        shippingAddress: data.shippingAddress,
      },
    });

    // Criar notificação
    await prisma.notification.create({
      data: {
        userId,
        type: 'NEW_ORDER',
        title: 'Novo pedido recebido',
        message: `Pedido #${order.orderNumber} de ${data.customerName}`,
        data: { orderId: order.id },
      },
    });

    // Transformar para o formato esperado pelo frontend
    return this.transformOrder(order);
  }

  async update(orderId: string, data: UpdateOrderData, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
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
    });

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
}

export default new OrdersService();
