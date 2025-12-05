import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🔧 Criando usuário administrador...\n');

    // Verificar se já existe admin
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (existingAdmin) {
      console.log('⚠️  Admin já existe!');
      console.log(`📧 Email: ${existingAdmin.email}`);
      console.log(`👤 Nome: ${existingAdmin.name}`);
      console.log('\n💡 Use o script resetAdminPassword.ts para redefinir a senha.\n');
      return;
    }

    // Dados do admin
    const adminEmail = 'admin@criatividadeeamor.com.br';
    const adminPassword = 'Admin@123'; // Senha padrão - MUDE DEPOIS!
    const adminName = 'Administrador';

    // Hash da senha
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Criar admin
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: adminName,
        role: 'ADMIN',
        phone: null,
      },
    });

    console.log('✅ Admin criado com sucesso!\n');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Senha:', adminPassword);
    console.log('👤 Nome:', adminName);
    console.log('\n⚠️  IMPORTANTE: Mude a senha após o primeiro login!\n');

  } catch (error) {
    console.error('❌ Erro ao criar admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin()
  .then(() => {
    console.log('🎉 Processo concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
