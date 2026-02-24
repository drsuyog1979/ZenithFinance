import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const emailArgs = process.argv.slice(2)[0];

  let user;
  if (emailArgs) {
    user = await prisma.user.findUnique({ where: { email: emailArgs } })
  } else {
    user = await prisma.user.findFirst()
  }

  if (!user) {
    console.log("No user found. Please login to the app first, then run `npx tsx seed.ts <your-email>`");
    return;
  }

  console.log(`Seeding data for user: ${user.email} (ID: ${user.id})`);

  // 1. Clear old data for this user
  await prisma.transaction.deleteMany({ where: { wallet: { userId: user.id } } })
  await prisma.budget.deleteMany({ where: { userId: user.id } })
  await prisma.wallet.deleteMany({ where: { userId: user.id } })

  // 2. Create 5 Wallets
  const wallets = await Promise.all([
    prisma.wallet.create({ data: { userId: user.id, name: "HDFC Savings", currency: "INR", openingBalance: 12500000, color: "#1a3c5e" } }), // 1,25,000
    prisma.wallet.create({ data: { userId: user.id, name: "ICICI Credit", currency: "INR", openingBalance: -1500000, color: "#ef4444" } }), // -15,000
    prisma.wallet.create({ data: { userId: user.id, name: "Cash Wallet", currency: "INR", openingBalance: 500000, color: "#10b981" } }),    // 5,000
    prisma.wallet.create({ data: { userId: user.id, name: "Sodexo Meal Pass", currency: "INR", openingBalance: 350000, color: "#3b82f6" } }), // 3,500
    prisma.wallet.create({ data: { userId: user.id, name: "Zerodha Funds", currency: "INR", openingBalance: 4500000, color: "#8b5cf6" } }),  // 45,000
  ]);

  console.log("Created 5 Wallets");

  // 3. Create Sample Budgets
  const currentMonthObj = new Date();
  const currentMonthStr = `${currentMonthObj.getFullYear()}-${String(currentMonthObj.getMonth() + 1).padStart(2, '0')}`;

  await Promise.all([
    prisma.budget.create({ data: { userId: user.id, category: "Food & Dining", monthYear: currentMonthStr, limitAmount: 2000000 } }), // 20k
    prisma.budget.create({ data: { userId: user.id, category: "Shopping", monthYear: currentMonthStr, limitAmount: 1500000 } }), // 15k
    prisma.budget.create({ data: { userId: user.id, category: "Transport", monthYear: currentMonthStr, limitAmount: 800000 } }), // 8k
    prisma.budget.create({ data: { userId: user.id, category: "Entertainment", monthYear: currentMonthStr, limitAmount: 1000000 } }), // 10k
  ]);

  console.log("Created Budgets");

  // 4. Generate 40 Transactions across the last 30 days
  const categories = ["Food & Dining", "Transport", "Shopping", "Housing", "Utilities", "Health", "Entertainment"];
  const expenses = [
    { desc: "Zomato Order", cat: "Food & Dining", amt: [300, 800] },
    { desc: "Uber Ride", cat: "Transport", amt: [150, 600] },
    { desc: "Amazon Purchase", cat: "Shopping", amt: [1000, 5000] },
    { desc: "Grocery Shopping", cat: "Food & Dining", amt: [1500, 4000] },
    { desc: "Electricity Bill", cat: "Utilities", amt: [2000, 3500] },
    { desc: "Netflix Subscription", cat: "Entertainment", amt: [649, 649] },
    { desc: "Pharmacy", cat: "Health", amt: [200, 1500] },
    { desc: "Movie Tickets", cat: "Entertainment", amt: [800, 1200] },
  ];

  const transactions = [];
  const now = new Date();

  // Salary Income
  transactions.push({
    userId: user.id,
    walletId: wallets[0].id,
    type: "INCOME" as const,
    amount: 15000000, // 1.5L
    date: new Date(now.getFullYear(), now.getMonth(), 1),
    category: "Income",
    description: "Monthly Salary",
    source: "MANUAL",
    isRecurring: true
  });

  for (let i = 0; i < 40; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    const expenseTemp = expenses[Math.floor(Math.random() * expenses.length)];
    const amountFloat = Math.floor(Math.random() * (expenseTemp.amt[1] - expenseTemp.amt[0] + 1)) + expenseTemp.amt[0];
    const amountPaise = amountFloat * 100;

    // Pick random wallet (usually HDFC or ICICI)
    const wallet = Math.random() > 0.3 ? wallets[0] : wallets[1];

    transactions.push({
      userId: user.id,
      walletId: wallet.id,
      type: "EXPENSE" as const,
      amount: amountPaise,
      date: date,
      category: expenseTemp.cat,
      description: expenseTemp.desc,
      source: Math.random() > 0.8 ? "GROWW" : "MANUAL",
      isRecurring: false
    });
  }

  await prisma.transaction.createMany({ data: transactions });
  console.log(`Created ${transactions.length} Transactions`);
  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
