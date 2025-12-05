import { Request, Response } from 'express';
import customerAuthService from '../services/customer-auth.service';
import { CustomerAuthRequest } from '../middlewares/auth.middleware';

class CustomerAuthController {
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      console.info('[CustomerAuthController] Login attempt', { email });
      const result = await customerAuthService.login({ email, password });
      console.info('[CustomerAuthController] Login success', { customerId: result.customer.id });
      res.json(result);
    } catch (error: any) {
      res.status(error.statusCode || 401).json({
        error: error.message || 'Erro ao fazer login',
      });
    }
  }

  async me(req: CustomerAuthRequest, res: Response) {
    try {
      const customer = await customerAuthService.getCustomerById(req.customerId!);
      res.json(customer);
    } catch (error: any) {
      res.status(error.statusCode || 404).json({
        error: error.message || 'Cliente não encontrado',
      });
    }
  }

  async updateProfile(req: CustomerAuthRequest, res: Response) {
    try {
      const { name, email, phone, avatar, currentPassword, newPassword } = req.body;
      console.info('[CustomerAuthController] Update profile', { customerId: req.customerId });
      const updatedCustomer = await customerAuthService.updateProfile(req.customerId!, {
        name,
        email,
        phone,
        avatar,
        currentPassword,
        newPassword,
      });
      res.json(updatedCustomer);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({
        error: error.message || 'Erro ao atualizar perfil',
      });
    }
  }

  logout(req: Request, res: Response) {
    res.json({ message: 'Logout realizado com sucesso' });
  }
}

export default new CustomerAuthController();
