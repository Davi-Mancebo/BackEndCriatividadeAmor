import { Request, Response } from 'express';
import reviewsService from '../services/reviews.service';

class ReviewsController {
  async create(req: Request, res: Response) {
    try {
      const review = await reviewsService.create(req.body);
      res.status(201).json(review);
    } catch (error: any) {
      console.error('Erro ao criar avaliação:', error);
      res.status(400).json({ error: error.message || 'Erro ao criar avaliação' });
    }
  }

  async getByProduct(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const result = await reviewsService.getByProduct(productId);
      res.json(result);
    } catch (error: any) {
      console.error('Erro ao buscar avaliações:', error);
      res.status(500).json({ error: error.message || 'Erro ao buscar avaliações' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const review = await reviewsService.update(id, req.body);
      res.json(review);
    } catch (error: any) {
      console.error('Erro ao atualizar avaliação:', error);
      const statusCode = error.message === 'Avaliação não encontrada' ? 404 : 400;
      res.status(statusCode).json({ error: error.message || 'Erro ao atualizar avaliação' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await reviewsService.delete(id);
      res.json({ message: 'Avaliação deletada com sucesso' });
    } catch (error: any) {
      console.error('Erro ao deletar avaliação:', error);
      const statusCode = error.message === 'Avaliação não encontrada' ? 404 : 400;
      res.status(statusCode).json({ error: error.message || 'Erro ao deletar avaliação' });
    }
  }

  async list(req: Request, res: Response) {
    try {
      const { verified, rating } = req.query;
      const filters: any = {};
      
      if (verified !== undefined) filters.verified = verified === 'true';
      if (rating) filters.rating = parseInt(rating as string);

      const reviews = await reviewsService.list(filters);
      res.json(reviews);
    } catch (error: any) {
      console.error('Erro ao listar avaliações:', error);
      res.status(500).json({ error: error.message || 'Erro ao listar avaliações' });
    }
  }
}

export default new ReviewsController();
