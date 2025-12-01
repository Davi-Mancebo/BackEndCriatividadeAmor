import prisma from '../lib/prisma';

class CustomersService {
  async list(filters?: { search?: string; page?: number; limit?: number }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          orders: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              status: true,
              createdAt: true
            },
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: {
              orders: true,
              reviews: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.customer.count({ where })
    ]);

    // Mapear clientes para incluir lastOrderDate, lastOrderId e totalSpent
    const customersWithOrderInfo = customers.map((customer: any) => {
      const lastOrder = customer.orders[0];
      
      // Calcular total gasto (apenas pedidos válidos)
      const totalSpent = customer.orders
        .filter((order: any) => ['DELIVERED', 'PAID', 'PROCESSING', 'SHIPPED'].includes(order.status))
        .reduce((sum: number, order: any) => sum + Number(order.total), 0);

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        age: customer.age,
        avatar: customer.avatar,
        createdAt: customer.createdAt,
        orderCount: customer._count.orders,
        reviewCount: customer._count.reviews,
        totalSpent: totalSpent,
        lastOrderDate: lastOrder?.createdAt || null,
        lastOrderId: lastOrder?.id || null,
        lastOrderNumber: lastOrder?.orderNumber || null
      };
    });

    return {
      customers: customersWithOrderInfo,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            status: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            comment: true,
            productId: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!customer) {
      throw new Error('Cliente não encontrado');
    }

    // Calcular estatísticas
    const stats = await prisma.$transaction([
      prisma.order.aggregate({
        where: { customerId: id, status: { in: ['DELIVERED', 'PAID', 'PROCESSING', 'SHIPPED'] } },
        _sum: { total: true },
        _count: { id: true }
      }),
      prisma.order.count({ where: { customerId: id, status: 'CANCELLED' } }),
      prisma.review.count({ where: { customerId: id } })
    ]);

    return {
      ...customer,
      stats: {
        totalSpent: stats[0]._sum.total || 0,
        totalOrders: stats[0]._count.id,
        cancelledOrders: stats[1],
        totalReviews: stats[2]
      }
    };
  }

  async getStats() {
    const [
      totalCustomers,
      newThisMonth,
      customersWithOrders,
      topCustomers,
      totalRevenueAgg,
      totalOrdersAgg
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      prisma.customer.count({
        where: {
          orders: {
            some: {}
          }
        }
      }),
      prisma.customer.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          _count: {
            select: {
              orders: true
            }
          }
        },
        where: {
          orders: {
            some: {}
          }
        },
        orderBy: {
          orders: {
            _count: 'desc'
          }
        },
        take: 5
      }),
      prisma.order.aggregate({
        where: { status: { in: ['DELIVERED', 'PAID', 'PROCESSING', 'SHIPPED'] } },
        _sum: { total: true }
      }),
      prisma.order.aggregate({
        _count: { id: true }
      })
    ]);

    const totalRevenue = totalRevenueAgg._sum.total || 0;
    const totalOrders = totalOrdersAgg._count.id || 0;
    const averageOrdersPerCustomer = totalCustomers > 0 ? (totalOrders / totalCustomers) : 0;

    return {
      totalCustomers,
      newThisMonth,
      customersWithOrders,
      customersWithoutOrders: totalCustomers - customersWithOrders,
      topCustomers,
      totalRevenue,
      averageOrdersPerCustomer
    };
  }

  async delete(id: string) {
    return await prisma.customer.delete({
      where: { id }
    });
  }
}

export default new CustomersService();
