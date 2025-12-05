import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import authService from '../services/auth.service';
import passwordResetService from '../services/password-reset.service';

class AuthController {
  async login(req: AuthRequest, res: Response) {
    try {
      const { email, password } = req.body;
      console.info('[AuthController] Login attempt', { email });
      const result = await authService.login({ email, password });
      console.info('[AuthController] Login success', { userId: result.user.id });
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
      const { name, email, phone, currentPassword, newPassword, avatar } = req.body;
      const updatedUser = await authService.updateProfile(req.userId!, {
        name,
        email,
        phone,
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

  async requestPasswordReset(req: AuthRequest, res: Response) {
    try {
      const { email } = req.body;
      console.info('[AuthController] Password reset requested', { email });
      await passwordResetService.request(email);
      res.json({ message: 'Se o email existir em nossa base, enviamos um código de verificação.' });
    } catch (error: any) {
      console.error('Erro ao solicitar recuperação de senha:', error);
      res.status(400).json({ error: error.message || 'Não foi possível iniciar a recuperação de senha.' });
    }
  }

  async verifyPasswordResetCode(req: AuthRequest, res: Response) {
    try {
      const { email, code } = req.body;
      await passwordResetService.verify(email, code);
      res.json({ valid: true });
    } catch (error: any) {
      console.error('Erro ao verificar código de recuperação:', error);
      res.status(error.statusCode || 400).json({ error: error.message || 'Código inválido.' });
    }
  }

  async resetPassword(req: AuthRequest, res: Response) {
    try {
      const { email, code, newPassword } = req.body;
      console.info('[AuthController] Reset password confirmation', { email, code });
      await passwordResetService.resetPassword(email, code, newPassword);
      res.json({ message: 'Senha atualizada com sucesso.' });
    } catch (error: any) {
      console.error('Erro ao redefinir senha:', error);
      res.status(error.statusCode || 400).json({ error: error.message || 'Não foi possível redefinir a senha.' });
    }
  }
}

export default new AuthController();
