import { Router } from 'express';
import { body, param } from 'express-validator';
import customersController from '../controllers/customers.controller';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../utils/validate';
import { BRAZIL_MOBILE_REGEX, formatBrazilianCellPhone } from '../utils/phone';

const router = Router();

// POST /api/customers/register - Cadastro público de clientes
router.post(
	'/register',
	validate([
		body('name').notEmpty().withMessage('Nome é obrigatório'),
		body('email').isEmail().withMessage('Email inválido'),
		body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
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
	]),
	customersController.register
);

// Todas as rotas requerem autenticação de admin
router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/customers - Listar clientes
router.get('/', customersController.list);

// GET /api/customers/stats - Estatísticas de clientes
router.get('/stats', customersController.getStats);

// GET /api/customers/:id - Buscar cliente por ID
router.get('/:id', customersController.getById);

// PUT /api/customers/:id - Atualizar cliente
router.put(
	'/:id',
	validate([
		param('id').isUUID().withMessage('ID inválido'),
		body('name').optional().notEmpty().withMessage('Nome não pode ser vazio'),
		body('email').optional().isEmail().withMessage('Email inválido'),
		body('phone')
			.optional({ nullable: true })
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
		body('password')
			.optional()
			.isLength({ min: 6 })
			.withMessage('Senha deve ter pelo menos 6 caracteres'),
		body('avatar').optional().isString(),
	]),
	customersController.update
);

// DELETE /api/customers/:id - Deletar cliente
router.delete('/:id', customersController.delete);

export default router;
