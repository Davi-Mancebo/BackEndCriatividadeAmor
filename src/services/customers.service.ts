import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import emailService from './email.service';
import { AppError } from '../middlewares/error.middleware';
import { BRAZIL_MOBILE_REGEX, formatBrazilianCellPhone } from '../utils/phone';

class CustomersService {
  async register(data: { name: string; email: string; password: string; phone?: string | null }) {
    const normalizedEmail = data.email.trim().toLowerCase();

    const existingCustomer = await prisma.customer.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingCustomer) {
      throw new AppError('Email já cadastrado', 409);
    }

    let formattedPhone: string | null = null;

    if (data.phone !== undefined && data.phone !== null && data.phone !== '') {
      const output = formatBrazilianCellPhone(data.phone);
      if (!output || !BRAZIL_MOBILE_REGEX.test(output)) {
        throw new AppError('Telefone inválido. Use o formato (XX) 9XXXX-XXXX', 400);
      }
      formattedPhone = output;
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const customer = await prisma.customer.create({
      data: {
        name: data.name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: formattedPhone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        createdAt: true,
      },
    });

    emailService
      .sendWelcomeEmail({ name: customer.name, email: customer.email })
      .catch((error) => console.error('Erro ao enviar email de boas-vindas:', error));

    return customer;
  }

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

  async update(id: string, data: { name?: string; email?: string; phone?: string | null; password?: string; avatar?: string | null }) {
    const customer = await prisma.customer.findUnique({ where: { id } });

    if (!customer) {
      throw new AppError('Cliente não encontrado', 404);
    }

    let formattedPhone: string | null | undefined = undefined;

    if (data.phone !== undefined) {
      if (data.phone === null || data.phone === '') {
        formattedPhone = null;
      } else {
        const normalized = formatBrazilianCellPhone(data.phone);

        if (!normalized || !BRAZIL_MOBILE_REGEX.test(normalized)) {
          throw new AppError('Telefone inválido. Use o formato (XX) 9XXXX-XXXX', 400);
        }

        formattedPhone = normalized;
      }
    }

    if (data.email && data.email.trim().toLowerCase() !== customer.email) {
      const existingCustomer = await prisma.customer.findUnique({
        where: { email: data.email.trim().toLowerCase() },
      });

      if (existingCustomer && existingCustomer.id !== id) {
        throw new AppError('Email já cadastrado', 409);
      }
    }

    const updatePayload: Record<string, unknown> = {};

    if (data.name !== undefined) {
      updatePayload.name = data.name.trim();
    }

    if (data.email !== undefined) {
      updatePayload.email = data.email.trim().toLowerCase();
    }

    if (formattedPhone !== undefined) {
      updatePayload.phone = formattedPhone;
    }

    if (data.avatar !== undefined) {
      updatePayload.avatar = data.avatar;
    }

    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      updatePayload.password = hashedPassword;
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: updatePayload,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedCustomer;
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
