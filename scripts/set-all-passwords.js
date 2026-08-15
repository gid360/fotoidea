const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  console.log('Generated hash for admin123:', hash);

  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users in database.`);

  for (const u of users) {
    await prisma.user.update({
      where: { id: u.id },
      data: {
        passwordHash: hash,
        isActive: true,
      }
    });
    console.log(`Updated user ${u.id}: [${u.role}] ${u.firstName} ${u.lastName} (email: ${u.email}, phone: ${u.phone})`);
  }

  console.log('All passwords successfully updated to: admin123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
