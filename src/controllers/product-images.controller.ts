import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import productImagesService from '../services/product-images.service';
import fs from 'fs/promises';

class ProductImagesController {
  async create(req: AuthRequest, res: Response) {
    const { productId } = req.params;
    const { alt, order } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }

    try {
      const productImage = await productImagesService.create({
        productId,
        file: req.file,
        alt,
        order: order ? parseInt(order) : undefined,
      });

      res.status(201).json(productImage);
    } catch (error) {
      // Limpar arquivo em caso de erro
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      throw error;
    }
  }

  async list(req: AuthRequest, res: Response) {
    try {
      const { productId } = req.params;
      const images = await productImagesService.list(productId);
      res.json(images);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        error: error.message || 'Erro ao listar imagens'
      });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { productId, imageId } = req.params;
      const { alt, order } = req.body;

      const updatedImage = await productImagesService.update(productId, imageId, {
        alt,
        order: order !== undefined ? parseInt(order) : undefined,
      });

      res.json(updatedImage);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({
        error: error.message || 'Erro ao atualizar imagem'
      });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { productId, imageId } = req.params;
      const result = await productImagesService.delete(productId, imageId);
      res.json(result);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({
        error: error.message || 'Erro ao deletar imagem'
      });
    }
  }

  async reorder(req: AuthRequest, res: Response) {
    try {
      const { productId } = req.params;
      const { imageIds } = req.body as { imageIds: string[] };

      const updatedImages = await productImagesService.reorder(productId, imageIds);
      res.json(updatedImages);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({
        error: error.message || 'Erro ao reordenar imagens'
      });
    }
  }

  async createBulk(req: AuthRequest, res: Response) {
    const { productId } = req.params;
    const { alts } = req.body;

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }

    try {
      // Parse alts se vier como string JSON
      let parsedAlts: string[] | undefined;
      if (alts) {
        parsedAlts = typeof alts === 'string' ? JSON.parse(alts) : alts;
      }

      const uploadedImages = await productImagesService.createBulk(
        productId,
        req.files as Express.Multer.File[],
        parsedAlts
      );

      res.status(201).json({
        message: `${uploadedImages.length} imagens enviadas com sucesso`,
        images: uploadedImages,
      });
    } catch (error) {
      // Limpar arquivos em caso de erro
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          await fs.unlink(file.path).catch(() => {});
        }
      }
      throw error;
    }
  }
}

export default new ProductImagesController();
