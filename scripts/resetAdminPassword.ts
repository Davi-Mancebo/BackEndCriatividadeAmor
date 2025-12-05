import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma';

const ADMIN_EMAIL = 'admin@criatividade.com';
const NEW_PASSWORD = 'admin123';

async function main() {
  const hashed = await bcrypt.hash(NEW_PASSWORD, 10);

  const admin = await prisma.user.update({
    where: { email: ADMIN_EMAIL },
    data: { password: hashed },
  });

  console.log(`Senha do admin (${admin.email}) redefinida para ${NEW_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error('Erro ao redefinir senha do admin:', error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
