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

const imageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const digitalMimes = [
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
];

const buildFilter = (allowedMimes: string[], errorMessage: string) => (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(errorMessage));
  }
};

const imageFileFilter = buildFilter(
  imageMimes,
  'Formato de imagem inválido. Use JPEG, PNG ou WebP.'
);

const digitalFileFilter = buildFilter(
  digitalMimes,
  'Formato inválido. Envie arquivos PDF ou ZIP.'
);

const imageUpload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

const digitalUpload = multer({
  storage,
  fileFilter: digitalFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB para arquivos digitais
  },
});

export const upload = imageUpload;
export const uploadDigital = digitalUpload;
