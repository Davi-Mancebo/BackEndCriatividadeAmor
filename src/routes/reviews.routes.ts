import { Router } from 'express';
import reviewsController from '../controllers/reviews.controller';

const router = Router();

// Rota de buscar avaliações de um produto deve ser registrada em products.routes.ts para manter a semântica REST.

// POST /api/reviews - Criar avaliação
router.post('/', reviewsController.create);

// GET /api/reviews - Listar todas as avaliações (admin)
router.get('/', reviewsController.list);

// PUT /api/reviews/:id - Atualizar avaliação
router.put('/:id', reviewsController.update);

// DELETE /api/reviews/:id - Deletar avaliação
router.delete('/:id', reviewsController.delete);

export default router;
