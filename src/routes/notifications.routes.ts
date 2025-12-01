import { Router } from 'express';
import { param } from 'express-validator';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../utils/validate';
import notificationsController from '../controllers/notifications.controller';

const router = Router();

// Todas as rotas precisam de autenticação
router.use(authMiddleware);

// GET /api/notifications - Listar notificações do usuário
router.get('/', notificationsController.list);

// PUT /api/notifications/:id/read - Marcar como lida
router.put(
  '/:id/read',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
  ]),
  notificationsController.markAsRead
);

// PUT /api/notifications/read-all - Marcar todas como lidas
router.put('/read-all', notificationsController.markAllAsRead);

// DELETE /api/notifications/:id - Deletar notificação
router.delete(
  '/:id',
  validate([
    param('id').isUUID().withMessage('ID inválido'),
  ]),
  notificationsController.delete
);

export default router;
