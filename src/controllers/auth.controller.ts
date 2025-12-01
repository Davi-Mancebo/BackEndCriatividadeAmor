import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import authService from '../services/auth.service';

class AuthController {
  async login(req: AuthRequest, res: Response) {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });
      res.json(result);
    } catch (error: any) {
      res.status(error.statusCode || 401).json({
        error: error.message || 'Erro ao fazer login'
      });
    }
  }

  async me(req: AuthRequest, res: Response) {
    try {
      const user = await authService.getUserById(req.userId!);
      res.json(user);
    } catch (error: any) {
      res.status(error.statusCode || 404).json({
        error: error.message || 'Usuário não encontrado'
      });
    }
  }

  async updateProfile(req: AuthRequest, res: Response) {
    try {
      const { name, email, currentPassword, newPassword, avatar } = req.body;
      const updatedUser = await authService.updateProfile(req.userId!, {
        name,
        email,
        currentPassword,
        newPassword,
        avatar,
      });
      res.json(updatedUser);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({
        error: error.message || 'Erro ao atualizar perfil'
      });
    }
  }

  logout(req: AuthRequest, res: Response) {
    res.json({ message: 'Logout realizado com sucesso' });
  }
}

export default new AuthController();
