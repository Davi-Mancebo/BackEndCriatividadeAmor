import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';

interface LoginData {
  email: string;
  password: string;
}

interface UpdateProfileData {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  avatar?: string;
}

class AuthService {
  async login(data: LoginData) {
    const { email, password } = data;

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

    return {
      user: userWithoutPassword,
      token,
    };
  }

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    return user;
  }

  async updateProfile(userId: string, data: UpdateProfileData) {
    const { name, email, currentPassword, newPassword, avatar } = data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
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
        where: { id: userId },
        data: { password: hashedPassword },
      });
    }

    // Atualizar outros campos
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(avatar !== undefined && { avatar }),
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

    return updatedUser;
  }
}

export default new AuthService();
