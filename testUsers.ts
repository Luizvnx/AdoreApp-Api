import { prisma } from './src/lib/prisma';

async function getUsers() {
  const users = await prisma.user.findMany({
    select: { email: true, roles: true, isActive: true }
  });
  console.log("Users:", users);
  process.exit(0);
}

getUsers();
