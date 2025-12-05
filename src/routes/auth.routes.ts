import { Router } from 'express';
import { body } from 'express-validator';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../utils/validate';
import authController from '../controllers/auth.controller';
import { BRAZIL_MOBILE_REGEX, formatBrazilianCellPhone } from '../utils/phone';

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

// POST /api/auth/password/forgot - Solicitar código de recuperação
router.post(
  '/password/forgot',
  validate([
    body('email').isEmail().withMessage('Email inválido'),
  ]),
  authController.requestPasswordReset
);

// POST /api/auth/password/verify - Validar código enviado por email
router.post(
  '/password/verify',
  validate([
    body('email').isEmail().withMessage('Email inválido'),
    body('code')
      .trim()
      .isLength({ min: 6, max: 6 })
      .withMessage('Código deve ter 6 dígitos'),
  ]),
  authController.verifyPasswordResetCode
);

// POST /api/auth/password/reset - Definir nova senha
router.post(
  '/password/reset',
  validate([
    body('email').isEmail().withMessage('Email inválido'),
    body('code')
      .trim()
      .isLength({ min: 6, max: 6 })
      .withMessage('Código deve ter 6 dígitos'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('Nova senha deve ter no mínimo 6 caracteres'),
  ]),
  authController.resetPassword
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
    body('phone')
      .optional()
      .customSanitizer((value) => {
        const formatted = formatBrazilianCellPhone(value);
        return formatted ?? value;
      })
      .custom((value) => {
        if (value === undefined || value === null || value === '') {
          return true;
        }
        return BRAZIL_MOBILE_REGEX.test(value as string);
      })
      .withMessage('Telefone deve seguir o formato (XX) 9XXXX-XXXX'),
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
