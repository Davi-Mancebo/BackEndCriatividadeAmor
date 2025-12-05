import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

interface AdminJwtPayload {
  userId?: string;
  type?: 'admin' | 'customer';
  role?: string;
}

interface CustomerJwtPayload {
  customerId?: string;
  type?: 'admin' | 'customer';
}

export interface AuthRequest extends Request {
  userId?: string;
}

export interface CustomerAuthRequest extends Request {
  customerId?: string;
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AdminJwtPayload;

    if (!decoded.userId) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    if (decoded.type && decoded.type !== 'admin') {
      return res.status(403).json({ error: 'Token não permitido para esta rota' });
    }

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

export const customerMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Qualquer usuário autenticado pode acessar (ADMIN ou CUSTOMER)
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao verificar usuário' });
  }
};

export const customerAuthMiddleware = async (
  req: CustomerAuthRequest,
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as CustomerJwtPayload;

    if (!decoded.customerId) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    if (decoded.type && decoded.type !== 'customer') {
      return res.status(403).json({ error: 'Token não permitido para esta rota' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: decoded.customerId },
    });

    if (!customer) {
      return res.status(401).json({ error: 'Cliente não encontrado' });
    }

    req.customerId = decoded.customerId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};
