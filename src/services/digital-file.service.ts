import { DigitalFile } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';

const ALLOWED_DIGITAL_MIME_TYPES = new Set([
  'application/pdf',
  'application/x-pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/octet-stream',
]);

const ALLOWED_DIGITAL_EXTENSIONS = new Set(['pdf', 'zip', 'rar']);

const getExtension = (value?: string | null) => {
  if (!value) return null;
  const sanitized = value.toLowerCase().split('?')[0];
  if (!sanitized.includes('.')) return null;
  const parts = sanitized.split('.');
  return parts[parts.length - 1] || null;
};

const isAllowedDigitalFile = (file: DigitalFile) => {
  const mime = file.fileType?.toLowerCase();
  if (mime && ALLOWED_DIGITAL_MIME_TYPES.has(mime)) {
    return true;
  }

  const urlExt = getExtension(file.fileUrl);
  if (urlExt && ALLOWED_DIGITAL_EXTENSIONS.has(urlExt)) {
    return true;
  }

  const nameExt = getExtension(file.name);
  if (nameExt && ALLOWED_DIGITAL_EXTENSIONS.has(nameExt)) {
    return true;
  }

  return false;
};

export class DigitalFileService {
  // Verificar se o produto existe e é digital
  async validateDigitalProduct(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    if (product.type !== 'DIGITAL') {
      throw new AppError('Apenas produtos digitais podem ter arquivos', 400);
    }

    return product;
  }

  // Verificar se cliente comprou o produto
  async checkPurchase(email: string, productId: string) {
    const purchase = await prisma.purchaseHistory.findFirst({
      where: {
        customerEmail: email,
        productId,
      },
    });

    return purchase;
  }

  // Criar arquivo digital
  async createDigitalFile(data: {
    productId: string;
    name: string;
    description?: string;
    fileUrl: string;
    fileSize: number;
    fileType: string;
  }) {
    return await prisma.digitalFile.create({
      data,
    });
  }

  // Listar arquivos de um produto
  async listProductFiles(productId: string) {
    return await prisma.digitalFile.findMany({
      where: { productId },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Buscar arquivos ativos de um produto (para download)
  async getActiveFiles(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        digitalFiles: {
          where: { active: true },
        },
      },
    });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    if (product.type !== 'DIGITAL') {
      throw new AppError('Este produto não possui arquivos digitais', 400);
    }

    const files = (product.digitalFiles || []).filter(isAllowedDigitalFile);

    return { product, files };
  }

  // Atualizar arquivo
  async updateFile(fileId: string, data: {
    name?: string;
    description?: string;
    active?: boolean;
  }) {
    return await prisma.digitalFile.update({
      where: { id: fileId },
      data,
    });
  }

  // Buscar arquivo por ID
  async getFileById(fileId: string) {
    const file = await prisma.digitalFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new AppError('Arquivo não encontrado', 404);
    }

    return file;
  }

  // Deletar arquivo
  async deleteFile(fileId: string) {
    return await prisma.digitalFile.delete({
      where: { id: fileId },
    });
  }

  // Incrementar contador de downloads
  async incrementDownloadCount(productId: string) {
    return await prisma.digitalFile.updateMany({
      where: { productId },
      data: {
        downloadCount: {
          increment: 1,
        },
      },
    });
  }

  // Estatísticas de downloads
  async getDownloadStats() {
    const [totalFiles, totalDownloads, filesByProduct] = await Promise.all([
      prisma.digitalFile.count({ where: { active: true } }),
      prisma.digitalFile.aggregate({
        _sum: { downloadCount: true },
      }),
      prisma.digitalFile.groupBy({
        by: ['productId'],
        _count: true,
        _sum: { downloadCount: true },
      }),
    ]);

    return {
      totalFiles,
      totalDownloads: totalDownloads._sum.downloadCount || 0,
      filesByProduct: filesByProduct.length,
    };
  }
}

export default new DigitalFileService();
