import { Router } from 'express';
import customersController from '../controllers/customers.controller';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Todas as rotas requerem autenticação de admin
router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/customers - Listar clientes
router.get('/', customersController.list);

// GET /api/customers/stats - Estatísticas de clientes
router.get('/stats', customersController.getStats);

// GET /api/customers/:id - Buscar cliente por ID
router.get('/:id', customersController.getById);

// DELETE /api/customers/:id - Deletar cliente
router.delete('/:id', customersController.delete);

export default router;
