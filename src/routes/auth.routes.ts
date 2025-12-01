import { Router } from 'express';
import { body } from 'express-validator';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../utils/validate';
import authController from '../controllers/auth.controller';

const router = Router();

// POST /api/auth/login - Login
router.post(
  '/login',
  validate([
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Senha obrigatória'),
  ]),
  authController.login
);

// GET /api/auth/me - Obter dados do usuário logado
router.get('/me', authMiddleware, authController.me);

// PUT /api/auth/profile - Atualizar perfil
router.put(
  '/profile',
  authMiddleware,
  validate([
    body('name').optional().notEmpty().withMessage('Nome não pode ser vazio'),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('phone').optional(),
    body('avatar').optional(),
    body('currentPassword').optional(),
    body('newPassword')
      .optional({ values: 'falsy' })
      .isLength({ min: 6 })
      .withMessage('Nova senha deve ter no mínimo 6 caracteres'),
  ]),
  authController.updateProfile
);

// POST /api/auth/logout - Logout (no servidor é apenas simbólico, o token é removido no client)
router.post('/logout', authMiddleware, authController.logout);

export default router;
