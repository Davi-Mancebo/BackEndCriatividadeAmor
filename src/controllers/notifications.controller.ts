import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import notificationsService from '../services/notifications.service';

class NotificationsController {
  async list(req: AuthRequest, res: Response) {
    try {
      const { read } = req.query;
      const result = await notificationsService.list(req.userId!, read as string | undefined);
      res.json(result);
    } catch (error: any) {
      console.error('Erro ao listar notificações:', error);
      res.status(500).json({ error: error.message || 'Erro ao listar notificações' });
    }
  }

  async markAsRead(req: AuthRequest, res: Response) {
    try {
      const updated = await notificationsService.markAsRead(req.params.id, req.userId!);
      res.json(updated);
    } catch (error: any) {
      console.error('Erro ao marcar notificação como lida:', error);
      res.status(500).json({ error: error.message || 'Erro ao atualizar notificação' });
    }
  }

  async markAllAsRead(req: AuthRequest, res: Response) {
    try {
      const result = await notificationsService.markAllAsRead(req.userId!);
      res.json(result);
    } catch (error: any) {
      console.error('Erro ao marcar todas como lidas:', error);
      res.status(500).json({ error: error.message || 'Erro ao atualizar notificações' });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const result = await notificationsService.delete(req.params.id, req.userId!);
      res.json(result);
    } catch (error: any) {
      console.error('Erro ao deletar notificação:', error);
      res.status(500).json({ error: error.message || 'Erro ao deletar notificação' });
    }
  }
}

export default new NotificationsController();
