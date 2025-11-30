import { Router, Request, Response } from 'express';
import { param } from 'express-validator';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { validate } from '../utils/validate';
import { AppError } from '../middlewares/error.middleware';

const router = Router();

// Todas as rotas precisam de autenticação
router.use(authMiddleware);

// GET /api/notifications - Listar notificações do usuário
router.get('/', async (req: AuthRequest, res: Response) => {
  const { read } = req.query;

  const where: any = {
    userId: req.userId,
  };

  if (read === 'true') {
    where.read = true;
  } else if (read === 'false') {
    where.read = false;
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50, // Limitar para as últimas 50
  });

  const unreadCount = await prisma.notification.count({
    where: {
      userId: req.userId,
      read: false,
    },
  });

  res.json({
    notifications,
    unreadCount,
  });
});

// PUT /api/notifications/:id/read - Marcar como lida
router.put(
  '/:id/read',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
  ]),
  async (req: AuthRequest, res: Response) => {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification) {
      throw new AppError('Notificação não encontrada', 404);
    }

    if (notification.userId !== req.userId) {
      throw new AppError('Acesso negado', 403);
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });

    res.json(updated);
  }
);

// PUT /api/notifications/read-all - Marcar todas como lidas
router.put('/read-all', async (req: AuthRequest, res: Response) => {
  await prisma.notification.updateMany({
    where: {
      userId: req.userId,
      read: false,
    },
    data: {
      read: true,
    },
  });

  res.json({ message: 'Todas as notificações foram marcadas como lidas' });
});

// DELETE /api/notifications/:id - Deletar notificação
router.delete(
  '/:id',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
  ]),
  async (req: AuthRequest, res: Response) => {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification) {
      throw new AppError('Notificação não encontrada', 404);
    }

    if (notification.userId !== req.userId) {
      throw new AppError('Acesso negado', 403);
    }

    await prisma.notification.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Notificação deletada com sucesso' });
  }
);

export default router;
