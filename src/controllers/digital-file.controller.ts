import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import digitalFileService from '../services/digital-file.service';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary';
import { AppError } from '../middlewares/error.middleware';

export class DigitalFileController {
  // Download de arquivos (público - com validação)
  async download(req: AuthRequest, res: Response) {
    try {
      const { productId } = req.params;
      const { email } = req.query;

      if (!email) {
        throw new AppError('Email obrigatório para download', 400);
      }

      // Buscar produto e arquivos válidos
      const { product, files } = await digitalFileService.getActiveFiles(productId);

      if (!files.length) {
        throw new AppError('Nenhum arquivo digital válido disponível para este produto.', 404);
      }

      // Verificar compra
      const purchase = await digitalFileService.checkPurchase(email as string, productId);

      if (!purchase) {
        throw new AppError('Você não comprou este produto', 403);
      }

      // Incrementar contador apenas quando existir arquivo válido
      await digitalFileService.incrementDownloadCount(productId);

      res.json({
        product: {
          id: product.id,
          title: product.title,
        },
        purchase: {
          orderId: purchase.orderId,
          purchasedAt: purchase.purchasedAt,
        },
        files: files.map((file: any) => ({
          id: file.id,
          name: file.name,
          description: file.description,
          fileSize: file.fileSize,
          fileType: file.fileType,
          downloadUrl: file.fileUrl,
        })),
        message: 'Clique no link para baixar seu arquivo',
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        error: error.message || 'Erro ao fazer download'
      });
    }
  }

  // Verificar acesso (público)
  async checkAccess(req: AuthRequest, res: Response) {
    try {
      const { productId } = req.params;
      const { email } = req.query;

      if (!email) {
        throw new AppError('Email obrigatório', 400);
      }

      const purchase = await digitalFileService.checkPurchase(email as string, productId);

      res.json({
        hasAccess: !!purchase,
        purchase: purchase || null,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        error: error.message || 'Erro ao verificar acesso'
      });
    }
  }

  // Criar arquivo digital (admin)
  async create(req: AuthRequest, res: Response) {
    try {
      const { productId } = req.params;
      const { name, description } = req.body;

      // Validar produto
      await digitalFileService.validateDigitalProduct(productId);

      if (!req.file) {
        throw new AppError('Arquivo obrigatório', 400);
      }

      // Upload para Cloudinary
      const uploadResult: any = await uploadToCloudinary(req.file.path, 'digital-products');

      // Criar registro
      const digitalFile = await digitalFileService.createDigitalFile({
        productId,
        name,
        description,
        fileUrl: typeof uploadResult === 'string' ? uploadResult : uploadResult.secure_url,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
      });

      res.status(201).json(digitalFile);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({
        error: error.message || 'Erro ao criar arquivo digital'
      });
    }
  }

  // Listar arquivos de um produto (admin)
  async list(req: AuthRequest, res: Response) {
    try {
      const { productId } = req.params;
      const files = await digitalFileService.listProductFiles(productId);
      res.json(files);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        error: error.message || 'Erro ao listar arquivos'
      });
    }
  }

  // Atualizar arquivo (admin)
  async update(req: AuthRequest, res: Response) {
    try {
      const { fileId } = req.params;
      const { name, description, active } = req.body;

      const file = await digitalFileService.updateFile(fileId, {
        name,
        description,
        active: active !== undefined ? Boolean(active) : undefined,
      });

      res.json(file);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({
        error: error.message || 'Erro ao atualizar arquivo'
      });
    }
  }

  // Deletar arquivo (admin)
  async delete(req: AuthRequest, res: Response) {
    try {
      const { fileId } = req.params;

      const file = await digitalFileService.getFileById(fileId);

      // Deletar do Cloudinary
      await deleteFromCloudinary(file.fileUrl);

      // Deletar do banco
      await digitalFileService.deleteFile(fileId);

      res.json({ message: 'Arquivo deletado com sucesso' });
    } catch (error: any) {
      res.status(error.statusCode || 400).json({
        error: error.message || 'Erro ao deletar arquivo'
      });
    }
  }

  // Estatísticas (admin)
  async stats(req: AuthRequest, res: Response) {
    try {
      const stats = await digitalFileService.getDownloadStats();
      res.json(stats);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        error: error.message || 'Erro ao buscar estatísticas'
      });
    }
  }
}

export default new DigitalFileController();
