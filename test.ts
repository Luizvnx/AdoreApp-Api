import * as dotenv from 'dotenv';
dotenv.config();
import { prisma } from './src/lib/prisma';

async function test() {
  try {
    const transactions = await prisma.financialTransaction.findMany({
      orderBy: { date: 'desc' },
      include: {
        service: { select: { serviceName: true } },
        createdBy: { select: { fullName: true } },
        editedBy: { select: { fullName: true } }
      }
    });
    console.log("SUCCESS:", transactions.length);
  } catch (err) {
    console.error("ERROR in findMany:", err);
  }

  try {
    const defaultAccount = await prisma.financialAccount.findFirst();
    console.log("Account SUCCESS");
  } catch(err) {
    console.error("Account ERROR", err);
  }

  process.exit(0);
}

test();
