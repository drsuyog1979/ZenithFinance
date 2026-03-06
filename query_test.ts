import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const result = await prisma.transaction.groupBy({
    by: ['category'],
    _sum: { amount: true }
  })
  console.log(result)
}
main()
