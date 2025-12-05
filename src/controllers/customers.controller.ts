import { Request, Response } from 'express';
import customersService from '../services/customers.service';

class CustomersController {
  async register(req: Request, res: Response) {
    try {
      const { name, email, password, phone } = req.body;
      const customer = await customersService.register({ name, email, password, phone });
      res.status(201).json(customer);
    } catch (error: any) {
      console.error('Erro ao registrar cliente:', error);
      res.status(error.statusCode || 400).json({ error: error.message || 'Erro ao registrar cliente' });
    }
  }

  async list(req: Request, res: Response) {
    try {
      const { search, page, limit } = req.query;
      const result = await customersService.list({
        search: search as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });
      res.json(result);
    } catch (error: any) {
      console.error('Erro ao listar clientes:', error);
      res.status(500).json({ error: error.message || 'Erro ao listar clientes' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const customer = await customersService.getById(req.params.id);
      res.json(customer);
    } catch (error: any) {
      console.error('Erro ao buscar cliente:', error);
      res.status(404).json({ error: error.message || 'Cliente não encontrado' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      console.info('[CustomersController] Update requested', { id });
      const updated = await customersService.update(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Erro ao atualizar cliente:', error);
      res.status(error.statusCode || 400).json({ error: error.message || 'Erro ao atualizar cliente' });
    }
  }

  async getStats(req: Request, res: Response) {
    try {
      const stats = await customersService.getStats();
      res.json(stats);
    } catch (error: any) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({ error: error.message || 'Erro ao buscar estatísticas' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      await customersService.delete(req.params.id);
      res.json({ message: 'Cliente deletado com sucesso' });
    } catch (error: any) {
      console.error('Erro ao deletar cliente:', error);
      res.status(400).json({ error: error.message || 'Erro ao deletar cliente' });
    }
  }
}

export default new CustomersController();
