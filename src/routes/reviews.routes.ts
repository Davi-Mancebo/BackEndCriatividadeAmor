import { Router } from 'express';
import reviewsController from '../controllers/reviews.controller';

const router = Router();

// GET /api/products/:productId/reviews - Buscar avaliações de um produto
router.get('/products/:productId/reviews', reviewsController.getByProduct);

// POST /api/reviews - Criar avaliação
router.post('/', reviewsController.create);

// GET /api/reviews - Listar todas as avaliações (admin)
router.get('/', reviewsController.list);

// PUT /api/reviews/:id - Atualizar avaliação
router.put('/:id', reviewsController.update);

// DELETE /api/reviews/:id - Deletar avaliação
router.delete('/:id', reviewsController.delete);

export default router;
