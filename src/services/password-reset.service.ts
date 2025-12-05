import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import emailService from './email.service';
import { AppError } from '../middlewares/error.middleware';

const CODE_EXPIRATION_MINUTES = Number(process.env.PASSWORD_RESET_EXPIRATION_MINUTES || 15);

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

class PasswordResetService {
  async request(email: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    const customer = !user
      ? await prisma.customer.findUnique({ where: { email: normalizedEmail } })
      : null;

    if (!user && !customer) {
      // Responder igual para não revelar se email existe
      return;
    }

    await prisma.passwordResetToken.updateMany({
      where: {
        email: normalizedEmail,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    const code = generateCode();
    const expiresAt = addMinutes(new Date(), CODE_EXPIRATION_MINUTES);

    await prisma.passwordResetToken.create({
      data: {
        email: normalizedEmail,
        code,
        expiresAt,
        userId: user?.id,
        customerId: customer?.id,
      },
    });

    await emailService.sendPasswordResetCode({
      email: normalizedEmail,
      code,
      name: user?.name || customer?.name || 'cliente',
      expiresAt,
    });
  }

  private async getValidToken(email: string, code: string) {
    const token = await prisma.passwordResetToken.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        code,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!token) {
      throw new AppError('Código inválido ou expirado', 400);
    }

    return token;
  }

  async verify(email: string, code: string) {
    await this.getValidToken(email, code);
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const token = await this.getValidToken(email, code);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (token.userId) {
      await prisma.user.update({
        where: { id: token.userId },
        data: { password: hashedPassword },
      });
    } else if (token.customerId) {
      await prisma.customer.update({
        where: { id: token.customerId },
        data: { password: hashedPassword },
      });
    } else {
      throw new AppError('Token inválido', 400);
    }

    await prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });
  }
}

export default new PasswordResetService();
