import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import authService from '../services/auth.service';

class AuthController {
  async login(req: AuthRequest, res: Response) {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    res.json(result);
  }

  async me(req: AuthRequest, res: Response) {
    const user = await authService.getUserById(req.userId!);
    res.json(user);
  }

  async updateProfile(req: AuthRequest, res: Response) {
    const { name, email, currentPassword, newPassword, avatar } = req.body;
    const updatedUser = await authService.updateProfile(req.userId!, {
      name,
      email,
      currentPassword,
      newPassword,
      avatar,
    });
    res.json(updatedUser);
  }

  logout(req: AuthRequest, res: Response) {
    res.json({ message: 'Logout realizado com sucesso' });
  }
}

export default new AuthController();
