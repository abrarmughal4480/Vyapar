import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create demo business
  const business = await prisma.business.create({
    data: {
      id: 'demo-business-123',
      name: 'Demo Business',
      gstNumber: 'GST123456789',
      address: 'Demo Address',
      phone: '03001234567',
      email: 'demo@business.com'
    }
  });

  console.log('Created business:', business);

  // Create demo user
  const user = await prisma.user.create({
    data: {
      email: 'demo@user.com',
      password: 'hashedpassword123',
      name: 'Demo User',
      phone: '03001234567',
      businessId: business.id
    }
  });

  console.log('Created user:', user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
