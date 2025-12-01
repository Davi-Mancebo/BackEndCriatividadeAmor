import { Router } from 'express';
import salesGoalsController from '../controllers/sales-goals.controller';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Todas as rotas requerem autenticação de admin
router.use(authMiddleware, adminMiddleware);

// GET /api/sales-goals/current - Meta do mês atual com progresso
router.get('/current', salesGoalsController.getCurrent);

// PUT /api/sales-goals/current - Atualizar meta do mês atual
router.put('/current', salesGoalsController.updateCurrent);

// GET /api/sales-goals - Listar todas as metas
router.get('/', salesGoalsController.list);

// POST /api/sales-goals - Criar nova meta
router.post('/', salesGoalsController.create);

// PUT /api/sales-goals - Atualizar/criar meta do mês atual (alias para /current)
router.put('/', salesGoalsController.updateCurrent);

// GET /api/sales-goals/:month/:year - Meta específica com progresso
router.get('/:month/:year', salesGoalsController.getByMonthYear);

// PUT /api/sales-goals/:month/:year - Atualizar meta
router.put('/:month/:year', salesGoalsController.update);

// DELETE /api/sales-goals/:id - Deletar meta por ID (UUID)
router.delete('/:id([0-9a-f-]{36})', salesGoalsController.deleteById);

// DELETE /api/sales-goals/:month/:year - Deletar meta por mês/ano
router.delete('/:month/:year', salesGoalsController.delete);

export default router;
