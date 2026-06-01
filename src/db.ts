import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function initializeAccount(userId: number) {
  const account = await prisma.account.findFirst({
    where: ({ userId } as any)
  });
  if (!account) {
    return prisma.account.create({
      data: ({ balance: 10000, userId } as any)
    });
  }
  return account;
}

export async function seedInitialInventory(userId: number) {
  const count = await prisma.inventoryItem.count({ where: ({ userId } as any) });
  if (count === 0) {
    // create items individually using relation connect to satisfy typed create input
    await prisma.inventoryItem.create({ data: ({ name: "Rice", quantity: 50, unitPrice: 40, totalValue: 50 * 40, userId } as any) });
    await prisma.inventoryItem.create({ data: ({ name: "Biscuits", quantity: 30, unitPrice: 25, totalValue: 30 * 25, userId } as any) });
    await prisma.inventoryItem.create({ data: ({ name: "Instant Noodles", quantity: 40, unitPrice: 20, totalValue: 40 * 20, userId } as any) });
  }
}

export default prisma;
