import { Router } from "express";
import bcryptjs from "bcryptjs";
import prisma, { initializeAccount, seedInitialInventory } from "./db";
import { TransactionPayload, InventoryItemPayload } from "./types";
import { AuthRequest } from "./auth";

const router = Router();

// ─── Status ──────────────────────────────────────────────────────────────────

router.get("/status", async (req: AuthRequest, res) => {
  const userId = req.userId!;

  const account = await prisma.account.findFirst({ where: { userId } as any });
  const items = await prisma.inventoryItem.findMany({ where: { userId } as any });
  const totalInventoryValue = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  res.json({
    balance: account?.balance ?? 0,
    totalInventoryValue,
    items: items.map((item) => ({
      ...item,
      totalValue: item.quantity * item.unitPrice,
    })),
  });
});

// ─── Stats (for charts / statistics page) ────────────────────────────────────

router.get("/stats", async (req: AuthRequest, res) => {
  const userId = req.userId!;

  const [account, items, transactions] = await Promise.all([
    prisma.account.findFirst({ where: { userId } as any }),
    prisma.inventoryItem.findMany({ where: { userId } as any }),
    prisma.transaction.findMany({
      where: { userId } as any,
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const totalInventoryValue = items.reduce(
    (sum, i) => sum + i.quantity * i.unitPrice,
    0
  );
  const incomeTotal = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expenseTotal = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  // Daily cash-flow for line chart
  const dailyMap = new Map<string, { income: number; expense: number }>();
  transactions.forEach((t) => {
    const day = new Date(t.createdAt).toISOString().slice(0, 10);
    const entry = dailyMap.get(day) ?? { income: 0, expense: 0 };
    if (t.type === "income") entry.income += t.amount;
    else entry.expense += t.amount;
    dailyMap.set(day, entry);
  });
  const dailyCashFlow = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  // Top items by value for pie chart
  const topItems = items
    .map((i) => ({ name: i.name, value: i.quantity * i.unitPrice }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  res.json({
    balance: account?.balance ?? 0,
    totalInventoryValue,
    incomeTotal,
    expenseTotal,
    transactionCount: transactions.length,
    itemCount: items.length,
    dailyCashFlow,
    topItems,
  });
});

// ─── Inventory Items ──────────────────────────────────────────────────────────

router.get("/items", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const search = (req.query.search as string) || "";

  const items = await prisma.inventoryItem.findMany({
    where: {
      userId,
      ...(search ? { name: { contains: search } } : {}),
    } as any,
    orderBy: { updatedAt: "desc" },
  });

  res.json(
    items.map((item) => ({
      ...item,
      totalValue: item.quantity * item.unitPrice,
    }))
  );
});

router.post("/items", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { name, quantity, unitPrice } = req.body as {
    name: string;
    quantity: number;
    unitPrice: number;
  };

  if (!name || typeof quantity !== "number" || typeof unitPrice !== "number") {
    return res.status(400).json({ error: "Invalid item payload" });
  }

  const totalValue = quantity * unitPrice;
  const item = await prisma.inventoryItem.create({
    data: { name, quantity, unitPrice, totalValue, userId } as any,
  });

  res.status(201).json({ ...item, totalValue: item.quantity * item.unitPrice });
});

router.patch("/items/:id", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const existing = await prisma.inventoryItem.findFirst({
    where: { id, userId } as any,
  });
  if (!existing) return res.status(404).json({ error: "Item not found" });

  const { name, quantity, unitPrice } = req.body as Partial<{
    name: string;
    quantity: number;
    unitPrice: number;
  }>;

  const data: any = {};
  if (name !== undefined) data.name = name;
  if (typeof quantity === "number") data.quantity = quantity;
  if (typeof unitPrice === "number") data.unitPrice = unitPrice;

  const finalQty =
    typeof quantity === "number" ? quantity : existing.quantity;
  const finalPrice =
    typeof unitPrice === "number" ? unitPrice : existing.unitPrice;
  data.totalValue = finalQty * finalPrice;

  const updated = await prisma.inventoryItem.update({ where: { id }, data });
  res.json({ ...updated, totalValue: updated.quantity * updated.unitPrice });
});

router.delete("/items/:id", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const item = await prisma.inventoryItem.findFirst({
    where: { id, userId } as any,
    include: { _count: { select: { transactions: true } } },
  });
  if (!item) return res.status(404).json({ error: "Item not found" });

  if ((item as any)._count.transactions > 0) {
    return res.status(409).json({
      error: "Cannot delete item — it has transaction history. Delete the transactions first.",
    });
  }

  await prisma.inventoryItem.delete({ where: { id } });
  res.status(204).end();
});

// ─── Transactions ─────────────────────────────────────────────────────────────

router.get("/transactions", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const limit = req.query.limit ? Math.min(Number(req.query.limit), 200) : 50;
  const offset = req.query.offset ? Number(req.query.offset) : 0;
  const search = (req.query.search as string) || "";
  const typeFilter = req.query.type as string | undefined;

  const where: any = { userId };
  if (search) where.description = { contains: search };
  if (typeFilter === "income" || typeFilter === "expense")
    where.type = typeFilter;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { items: { include: { item: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json({ data: transactions, pagination: { total, limit, offset } });
});

router.post("/transactions", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const payload = req.body as TransactionPayload;

  if (
    !payload ||
    !payload.type ||
    !payload.description ||
    !payload.amount ||
    !Array.isArray(payload.items)
  ) {
    return res.status(400).json({ error: "Invalid transaction payload" });
  }

  const account = await prisma.account.findFirst({ where: { userId } as any });
  if (!account) return res.status(500).json({ error: "Account not initialized" });

  const newBalance =
    payload.type === "expense"
      ? account.balance - payload.amount
      : account.balance + payload.amount;

  if (newBalance < 0) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  const transaction = await prisma.transaction.create({
    data: {
      type: payload.type,
      description: payload.description,
      amount: payload.amount,
      userId,
      items: {
        create: await Promise.all(
          payload.items.map(async (item) => {
            let inventoryItem = await prisma.inventoryItem.findFirst({
              where: { name: item.name, userId } as any,
            });

            if (!inventoryItem) {
              inventoryItem = await prisma.inventoryItem.create({
                data: {
                  name: item.name,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalValue: item.quantity * item.unitPrice,
                  userId,
                } as any,
              });
            } else {
              const newQty =
                payload.type === "expense"
                  ? inventoryItem.quantity + item.quantity
                  : Math.max(0, inventoryItem.quantity - item.quantity);
              inventoryItem = await prisma.inventoryItem.update({
                where: { id: inventoryItem.id },
                data: {
                  quantity: newQty,
                  unitPrice: item.unitPrice,
                  totalValue: newQty * item.unitPrice,
                },
              });
            }

            return {
              item: { connect: { id: inventoryItem.id } },
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            };
          })
        ),
      },
    } as any,
    include: { items: { include: { item: true } } },
  });

  await prisma.account.update({
    where: { id: account.id },
    data: { balance: newBalance },
  });

  res.status(201).json({ transaction, balance: newBalance });
});

router.delete("/transactions/:id", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const tx = await prisma.transaction.findFirst({
    where: { id, userId } as any,
    include: { items: { include: { item: true } } },
  });
  if (!tx) return res.status(404).json({ error: "Transaction not found" });

  // Reverse inventory changes
  for (const txItem of tx.items) {
    const inv = txItem.item;
    const reversedQty =
      tx.type === "expense"
        ? Math.max(0, inv.quantity - txItem.quantity)
        : inv.quantity + txItem.quantity;
    await prisma.inventoryItem.update({
      where: { id: inv.id },
      data: {
        quantity: reversedQty,
        totalValue: reversedQty * inv.unitPrice,
      },
    });
  }

  // Reverse balance
  const account = await prisma.account.findFirst({ where: { userId } as any });
  if (account) {
    const reversedBalance =
      tx.type === "expense"
        ? account.balance + tx.amount
        : account.balance - tx.amount;
    await prisma.account.update({
      where: { id: account.id },
      data: { balance: reversedBalance },
    });
  }

  // Delete junction rows first, then transaction
  await prisma.itemTransaction.deleteMany({ where: { transactionId: id } });
  await prisma.transaction.delete({ where: { id } });

  res.status(204).end();
});

// ─── Account ──────────────────────────────────────────────────────────────────

router.get("/account", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const account = await prisma.account.findFirst({ where: { userId } as any });
  res.json({ balance: account?.balance ?? 0 });
});

router.patch("/account", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { balance } = req.body;

  if (typeof balance !== "number" || Number.isNaN(balance) || balance < 0) {
    return res.status(400).json({ error: "Invalid balance value" });
  }

  const account = await prisma.account.findFirst({ where: { userId } as any });
  if (!account) return res.status(404).json({ error: "Account not found" });

  const updated = await prisma.account.update({
    where: { id: account.id },
    data: { balance },
  });

  res.json({ balance: updated.balance });
});

// ─── Profile ──────────────────────────────────────────────────────────────────

router.get("/me", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});

router.patch("/profile", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { name } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Name is required" });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { name: name.trim() },
    select: { id: true, email: true, name: true },
  });

  res.json({ user: updated });
});

router.patch("/profile/password", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "currentPassword and newPassword are required" });
  }

  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: "New password must be at least 6 characters" });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const valid = await bcryptjs.compare(currentPassword, user.password);
  if (!valid) return res.status(401).json({ error: "Current password is incorrect" });

  const hashed = await bcryptjs.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

  res.json({ ok: true });
});

export default router;
