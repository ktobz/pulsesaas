import { prisma } from './index';

async function seed() {
  console.log('Seeding database...');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@saas.com' },
    update: {},
    create: {
      email: 'admin@saas.com',
      name: 'Admin User',
      role: 'admin',
    },
  });

  console.log(`Created admin user: ${admin.id}`);
  console.log('Seeding complete.');
}

seed()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
