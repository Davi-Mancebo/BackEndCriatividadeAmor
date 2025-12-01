import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import productsService from '../services/products.service';

class ProductsController {
  async list(req: AuthRequest, res: Response) {
    const filters = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      category: req.query.category as string | undefined,
      search: req.query.search as string | undefined,
      featured: req.query.featured === 'true' ? true : undefined,
      active: req.query.active === 'false' ? false : true,
      sortBy: (req.query.sortBy as string) || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const result = await productsService.list(filters);
    res.json(result);
  }

  async getById(req: AuthRequest, res: Response) {
    const product = await productsService.getById(req.params.id);
    res.json(product);
  }

  async create(req: AuthRequest, res: Response) {
    const {
      title,
      description,
      price,
      comparePrice,
      stock,
      category,
      tags,
      type,
      condition,
      featured,
      sku,
      weight,
      dimensions,
    } = req.body;

    const product = await productsService.create(
      {
        title,
        description,
        price: parseFloat(price),
        comparePrice: comparePrice ? parseFloat(comparePrice) : undefined,
        stock: stock ? parseInt(stock) : undefined,
        category,
        tags,
        type,
        condition,
        featured,
        sku,
        weight: weight ? parseFloat(weight) : undefined,
        dimensions,
      },
      req.userId!
    );

    res.status(201).json(product);
  }

  async update(req: AuthRequest, res: Response) {
    const {
      title,
      description,
      price,
      comparePrice,
      stock,
      category,
      tags,
      featured,
      active,
      sku,
      weight,
      dimensions,
    } = req.body;

    const updatedProduct = await productsService.update(
      req.params.id,
      {
        title,
        description,
        price: price ? parseFloat(price) : undefined,
        comparePrice: comparePrice !== undefined ? (comparePrice ? parseFloat(comparePrice) : undefined) : undefined,
        stock: stock !== undefined ? parseInt(stock) : undefined,
        category,
        tags,
        featured,
        active,
        sku,
        weight: weight !== undefined ? (weight ? parseFloat(weight) : undefined) : undefined,
        dimensions,
      },
      req.userId!
    );

    res.json(updatedProduct);
  }

  async delete(req: AuthRequest, res: Response) {
    const result = await productsService.delete(req.params.id);
    res.json(result);
  }

  async permanentDelete(req: AuthRequest, res: Response) {
    const result = await productsService.permanentDelete(req.params.id);
    res.json(result);
  }
}

export default new ProductsController();
