import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Configuração para salvar localmente com pasta por produto
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Se tiver productId na rota, criar pasta específica
    const productId = req.params.productId;
    const baseDir = 'uploads/products';
    
    if (productId) {
      const productDir = path.join(baseDir, productId);
      
      // Criar diretório se não existir
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }
      if (!fs.existsSync(productDir)) {
        fs.mkdirSync(productDir, { recursive: true });
      }
      
      cb(null, productDir);
    } else {
      // Fallback para pasta geral
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }
      cb(null, baseDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Filtro de tipos de arquivo
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de imagem inválido. Use JPEG, PNG ou WebP.'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});
