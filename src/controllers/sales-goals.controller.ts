import { Request, Response } from 'express';
import salesGoalsService from '../services/sales-goals.service';

class SalesGoalsController {
  async create(req: Request, res: Response) {
    try {
      const { month, year, targetValue, description } = req.body;

      if (!month || !year || !targetValue) {
        return res.status(400).json({ error: 'Mês, ano e valor da meta são obrigatórios' });
      }

      if (month < 1 || month > 12) {
        return res.status(400).json({ error: 'Mês deve estar entre 1 e 12' });
      }

      if (targetValue <= 0) {
        return res.status(400).json({ error: 'Valor da meta deve ser maior que zero' });
      }

      const goal = await salesGoalsService.create({
        month,
        year,
        targetValue,
        description
      });

      return res.status(201).json(goal);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async getCurrent(req: Request, res: Response) {
    try {
      const result = await salesGoalsService.getCurrent();
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async updateCurrent(req: Request, res: Response) {
    try {
      // Suportar tanto targetValue quanto target (frontend pode enviar qualquer um)
      const targetValue = req.body.targetValue || req.body.target;
      const description = req.body.description;

      if (!targetValue || targetValue <= 0) {
        return res.status(400).json({ error: 'Valor da meta deve ser maior que zero' });
      }

      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const goal = await salesGoalsService.update(
        month,
        year,
        { targetValue, description }
      );

      return res.json(goal);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async getByMonthYear(req: Request, res: Response) {
    try {
      const month = parseInt(req.params.month);
      const year = parseInt(req.params.year);

      if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
        return res.status(400).json({ error: 'Mês inválido (1-12) ou ano inválido' });
      }

      const result = await salesGoalsService.getByMonthYear(month, year);
      return res.json(result);
    } catch (error: any) {
      return res.status(404).json({ error: error.message });
    }
  }

  async list(req: Request, res: Response) {
    try {
      const goals = await salesGoalsService.list();
      return res.json(goals);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const month = parseInt(req.params.month);
      const year = parseInt(req.params.year);
      const { targetValue, description } = req.body;

      if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
        return res.status(400).json({ error: 'Mês inválido (1-12) ou ano inválido' });
      }

      if (targetValue !== undefined && targetValue <= 0) {
        return res.status(400).json({ error: 'Valor da meta deve ser maior que zero' });
      }

      const goal = await salesGoalsService.update(
        month,
        year,
        { targetValue, description }
      );

      return res.json(goal);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const month = parseInt(req.params.month);
      const year = parseInt(req.params.year);

      if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
        return res.status(400).json({ error: 'Mês inválido (1-12) ou ano inválido' });
      }

      await salesGoalsService.delete(month, year);
      return res.status(204).send();
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async deleteById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'ID é obrigatório' });
      }

      await salesGoalsService.deleteById(id);
      return res.status(204).send();
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}

export default new SalesGoalsController();
