import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import ordersService from '../services/orders.service';

class OrdersController {
  async list(req: AuthRequest, res: Response) {
    const filters = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      sortBy: (req.query.sortBy as string) || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const result = await ordersService.list(filters, req.userId!);
    res.json(result);
  }

  async stats(req: AuthRequest, res: Response) {
    const stats = await ordersService.getStats();
    res.json(stats);
  }

  async getById(req: AuthRequest, res: Response) {
    const order = await ordersService.getById(req.params.id);
    res.json(order);
  }

  async create(req: AuthRequest, res: Response) {
    const { customerName, customerEmail, customerPhone, items, subtotal, shipping, total, shippingAddress } = req.body;
    const order = await ordersService.create(
      { customerName, customerEmail, customerPhone, items, subtotal, shipping, total, shippingAddress },
      req.userId!
    );
    res.status(201).json(order);
  }

  async update(req: AuthRequest, res: Response) {
    const { status, trackingCode, notes } = req.body;
    const updatedOrder = await ordersService.update(req.params.id, { status, trackingCode, notes }, req.userId!);
    res.json(updatedOrder);
  }

  async delete(req: AuthRequest, res: Response) {
    await ordersService.delete(req.params.id);
    res.status(204).send();
  }

  // ============================================
  // MÉTODOS PÚBLICOS (Cliente)
  // ============================================

  async trackOrder(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { email } = req.query;
    
    const order = await ordersService.trackOrder(id, email as string);
    res.json(order);
  }

  async getMyOrders(req: AuthRequest, res: Response) {
    const { email } = req.query;
    const filters = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
    };

    const result = await ordersService.getMyOrders(email as string, filters);
    res.json(result);
  }
}

export default new OrdersController();
