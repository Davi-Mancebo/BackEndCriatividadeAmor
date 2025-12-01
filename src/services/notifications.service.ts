import prisma from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';

class NotificationsService {
  async list(userId: string, readFilter?: string) {
    const where: any = { userId };

    if (readFilter === 'true') {
      where.read = true;
    } else if (readFilter === 'false') {
      where.read = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });

    return {
      notifications,
      unreadCount,
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new AppError('Notificação não encontrada', 404);
    }

    if (notification.userId !== userId) {
      throw new AppError('Acesso negado', 403);
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    return updated;
  }

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    return { message: 'Todas as notificações foram marcadas como lidas' };
  }

  async delete(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new AppError('Notificação não encontrada', 404);
    }

    if (notification.userId !== userId) {
      throw new AppError('Acesso negado', 403);
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return { message: 'Notificação deletada com sucesso' };
  }
}

export default new NotificationsService();
