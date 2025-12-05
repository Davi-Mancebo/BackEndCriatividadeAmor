import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import { BRAZIL_MOBILE_REGEX, formatBrazilianCellPhone } from '../utils/phone';

interface CustomerLoginData {
  email: string;
  password: string;
}

interface CustomerUpdateProfileData {
  name?: string;
  email?: string;
  phone?: string | null;
  avatar?: string | null;
  currentPassword?: string;
  newPassword?: string;
}

class CustomerAuthService {
  async login(data: CustomerLoginData) {
    const email = data.email.trim().toLowerCase();
    const { password } = data;

    const customer = await prisma.customer.findUnique({
      where: { email },
    });

    if (!customer) {
      throw new AppError('Credenciais inválidas', 401);
    }

    const validPassword = await bcrypt.compare(password, customer.password);

    if (!validPassword) {
      throw new AppError('Credenciais inválidas', 401);
    }

    const token = jwt.sign(
      {
        customerId: customer.id,
        type: 'customer',
      },
      process.env.JWT_SECRET as string
    );

    const { password: _password, ...customerData } = customer;

    return {
      customer: customerData,
      token,
    };
  }

  async getCustomerById(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        age: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!customer) {
      throw new AppError('Cliente não encontrado', 404);
    }

    return customer;
  }

  async updateProfile(customerId: string, data: CustomerUpdateProfileData) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new AppError('Cliente não encontrado', 404);
    }

    if ((data.currentPassword && !data.newPassword) || (!data.currentPassword && data.newPassword)) {
      throw new AppError('Para alterar a senha, forneça a senha atual e a nova senha', 400);
    }

    if (data.currentPassword && data.newPassword) {
      const validPassword = await bcrypt.compare(data.currentPassword, customer.password);

      if (!validPassword) {
        throw new AppError('Senha atual incorreta', 401);
      }

      const hashedPassword = await bcrypt.hash(data.newPassword, 10);
      await prisma.customer.update({
        where: { id: customerId },
        data: { password: hashedPassword },
      });
    }

    let normalizedPhone: string | null | undefined = undefined;

    if (data.phone !== undefined) {
      if (data.phone === null || data.phone === '') {
        normalizedPhone = null;
      } else {
        const formattedPhone = formatBrazilianCellPhone(data.phone);

        if (!formattedPhone || !BRAZIL_MOBILE_REGEX.test(formattedPhone)) {
          throw new AppError('Telefone inválido. Use o formato (XX) 9XXXX-XXXX', 400);
        }

        normalizedPhone = formattedPhone;
      }
    }

    if (data.email && data.email.trim().toLowerCase() !== customer.email) {
      const existingEmail = await prisma.customer.findUnique({
        where: { email: data.email.trim().toLowerCase() },
      });

      if (existingEmail && existingEmail.id !== customerId) {
        throw new AppError('Email já cadastrado', 409);
      }
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.email && { email: data.email.trim().toLowerCase() }),
        ...(normalizedPhone !== undefined && { phone: normalizedPhone }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        age: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedCustomer;
  }
}

export default new CustomerAuthService();
