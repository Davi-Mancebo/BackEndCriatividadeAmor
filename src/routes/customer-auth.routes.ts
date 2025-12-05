import { Router } from 'express';
import { body } from 'express-validator';
import customerAuthController from '../controllers/customer-auth.controller';
import { customerAuthMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../utils/validate';
import { BRAZIL_MOBILE_REGEX, formatBrazilianCellPhone } from '../utils/phone';

const router = Router();

router.post(
  '/login',
  validate([
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Senha obrigatória'),
  ]),
  customerAuthController.login
);

router.get('/me', customerAuthMiddleware, customerAuthController.me);

router.put(
  '/profile',
  customerAuthMiddleware,
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
  customerAuthController.updateProfile
);

router.post('/logout', customerAuthMiddleware, customerAuthController.logout);

export default router;
