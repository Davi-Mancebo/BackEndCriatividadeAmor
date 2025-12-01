import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

interface JwtPayload {
  userId: string;
}

export interface AuthRequest extends Request {
  userId?: string;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const [, token] = authHeader.split(' ');

    if (!token) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    // Verificar se o usuário ainda existe
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

export const adminMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao verificar permissões' });
  }
};
