import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { validate } from '../utils/validate';
import { AppError } from '../middlewares/error.middleware';

const router = Router();

// POST /api/auth/login - Login
router.post(
  '/login',
  validate([
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Senha obrigatória'),
  ]),
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError('Credenciais inválidas', 401);
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      throw new AppError('Credenciais inválidas', 401);
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string
    );

    // Não retornar a senha
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      token,
    });
  }
);

// GET /api/auth/me - Obter dados do usuário logado
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError('Usuário não encontrado', 404);
  }

  res.json(user);
});

// PUT /api/auth/profile - Atualizar perfil
router.put(
  '/profile',
  authMiddleware,
  validate([
    body('name').optional().notEmpty().withMessage('Nome não pode ser vazio'),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('currentPassword').optional(),
    body('newPassword')
      .optional()
      .isLength({ min: 6 })
      .withMessage('Nova senha deve ter no mínimo 6 caracteres'),
  ]),
  async (req: AuthRequest, res: Response) => {
    const { name, email, currentPassword, newPassword, avatar } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      throw new AppError('Usuário não encontrado', 404);
    }

    // Se está tentando mudar a senha
    if (currentPassword && newPassword) {
      const validPassword = await bcrypt.compare(currentPassword, user.password);

      if (!validPassword) {
        throw new AppError('Senha atual incorreta', 401);
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await prisma.user.update({
        where: { id: req.userId },
        data: { password: hashedPassword },
      });
    }

    // Atualizar outros campos
    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(avatar && { avatar }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    });

    res.json(updatedUser);
  }
);

// POST /api/auth/logout - Logout (no servidor é apenas simbólico, o token é removido no client)
router.post('/logout', authMiddleware, (req: Request, res: Response) => {
  res.json({ message: 'Logout realizado com sucesso' });
});

export default router;
