import { Router, Request, Response } from 'express';
import { query, param, body } from 'express-validator';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { validate } from '../utils/validate';
import { AppError } from '../middlewares/error.middleware';

const router = Router();

// Todas as rotas precisam de autenticação
router.use(authMiddleware);

// GET /api/orders - Listar pedidos com filtros
router.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite inválido'),
    query('status').optional().isIn(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
    query('search').optional().isString(),
    query('sortBy').optional().isIn(['createdAt', 'total', 'customerName']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ]),
  async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

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

    res.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  }
);

// GET /api/orders/stats - Estatísticas do dashboard
router.get('/stats', async (req: AuthRequest, res: Response) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    totalOrders,
    pendingOrders,
    monthRevenue,
    lastMonthRevenue,
    recentOrders,
    statusCount,
  ] = await Promise.all([
    // Total de pedidos
    prisma.order.count(),

    // Pedidos pendentes
    prisma.order.count({
      where: { status: 'PENDING' },
    }),

    // Receita do mês atual
    prisma.order.aggregate({
      where: {
        createdAt: { gte: startOfMonth },
        status: { notIn: ['CANCELLED'] },
      },
      _sum: { total: true },
    }),

    // Receita do mês passado
    prisma.order.aggregate({
      where: {
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        status: { notIn: ['CANCELLED'] },
      },
      _sum: { total: true },
    }),

    // Pedidos recentes
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),

    // Contagem por status
    prisma.order.groupBy({
      by: ['status'],
      _count: true,
    }),
  ]);

  const currentRevenue = monthRevenue._sum.total || 0;
  const lastRevenue = lastMonthRevenue._sum.total || 0;
  const revenueGrowth = lastRevenue > 0 
    ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 
    : 0;

  res.json({
    overview: {
      totalOrders,
      pendingOrders,
      monthRevenue: currentRevenue,
      revenueGrowth: Math.round(revenueGrowth * 100) / 100,
    },
    recentOrders,
    statusDistribution: statusCount.map((item: any) => ({
      status: item.status,
      count: item._count,
    })),
  });
});

// GET /api/orders/:id - Detalhes de um pedido
router.get(
  '/:id',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
  ]),
  async (req: AuthRequest, res: Response) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
    });

    if (!order) {
      throw new AppError('Pedido não encontrado', 404);
    }

    res.json(order);
  }
);

// PUT /api/orders/:id - Atualizar pedido (status e tracking)
router.put(
  '/:id',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
    body('status').optional().isIn(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
    body('trackingCode').optional().isString(),
    body('notes').optional().isString(),
  ]),
  async (req: AuthRequest, res: Response) => {
    const { status, trackingCode, notes } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
    });

    if (!order) {
      throw new AppError('Pedido não encontrado', 404);
    }

    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        ...(status && { status }),
        ...(trackingCode !== undefined && { trackingCode }),
        ...(notes !== undefined && { notes }),
      },
    });

    // Criar notificação se o status foi alterado
    if (status && status !== order.status) {
      await prisma.notification.create({
        data: {
          userId: req.userId!,
          type: 'ORDER_UPDATE',
          title: 'Pedido atualizado',
          message: `Pedido #${order.orderNumber} mudou de ${order.status} para ${status}`,
          data: { orderId: order.id },
        },
      });
    }

    res.json(updatedOrder);
  }
);

// POST /api/orders - Criar novo pedido (opcional, caso queira criar manualmente)
router.post(
  '/',
  validate([
    body('customerName').notEmpty().withMessage('Nome do cliente obrigatório'),
    body('customerEmail').optional().isEmail(),
    body('items').isArray({ min: 1 }).withMessage('Items obrigatórios'),
    body('total').isFloat({ min: 0 }).withMessage('Total inválido'),
  ]),
  async (req: AuthRequest, res: Response) => {
    const { customerName, customerEmail, customerPhone, items, subtotal, shipping, total, shippingAddress } = req.body;

    const order = await prisma.order.create({
      data: {
        customerName,
        customerEmail,
        customerPhone,
        items,
        subtotal,
        shipping: shipping || 0,
        total,
        shippingAddress,
      },
    });

    // Criar notificação
    await prisma.notification.create({
      data: {
        userId: req.userId!,
        type: 'NEW_ORDER',
        title: 'Novo pedido recebido',
        message: `Pedido #${order.orderNumber} de ${customerName}`,
        data: { orderId: order.id },
      },
    });

    res.status(201).json(order);
  }
);

export default router;
