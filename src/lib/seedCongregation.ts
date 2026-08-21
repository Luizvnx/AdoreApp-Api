import { prisma } from './prisma';

export async function ensureHeadquarterCongregation() {
  try {
    // 1. Procura se existe alguma congregação definida como Sede ou qualquer congregação
    let headquarter = await prisma.congregation.findFirst({
      where: { isHeadquarter: true }
    });

    if (!headquarter) {
      headquarter = await prisma.congregation.findFirst();
    }

    // 2. Se nenhuma congregação existir, cria a "Sede Central (Matriz)"
    if (!headquarter) {
      headquarter = await prisma.congregation.create({
        data: {
          name: 'Sede Central (Matriz)',
          address: 'Endereço da Sede',
          phone: '(00) 00000-0000',
          isHeadquarter: true
        }
      });
      console.log('🏛️ [MULTI-CONGREGAÇÕES] Congregação Sede Central (Matriz) criada com sucesso:', headquarter.id);
    }

    const headquarterId = headquarter.id;

    // 3. Atualiza registros legados sem congregationId
    const [usersCount, visitorsCount, gcsCount, accountsCount, transactionsCount, fixedCount] = await Promise.all([
      prisma.user.updateMany({
        where: { congregationId: null },
        data: { congregationId: headquarterId }
      }),
      prisma.visitor.updateMany({
        where: { congregationId: null },
        data: { congregationId: headquarterId }
      }),
      prisma.connectionGroup.updateMany({
        where: { congregationId: null },
        data: { congregationId: headquarterId }
      }),
      prisma.financialAccount.updateMany({
        where: { congregationId: null },
        data: { congregationId: headquarterId }
      }),
      prisma.financialTransaction.updateMany({
        where: { congregationId: null },
        data: { congregationId: headquarterId }
      }),
      prisma.fixedExpense.updateMany({
        where: { congregationId: null },
        data: { congregationId: headquarterId }
      })
    ]);

    if (usersCount.count > 0 || visitorsCount.count > 0 || gcsCount.count > 0) {
      console.log(`🏛️ [MULTI-CONGREGAÇÕES] Vinculados à Sede Central: ${usersCount.count} usuários, ${visitorsCount.count} visitantes, ${gcsCount.count} GCs, ${accountsCount.count} contas, ${transactionsCount.count} transações, ${fixedCount.count} gastos fixos.`);
    }

    return headquarter;
  } catch (error) {
    console.error('❌ Error in ensureHeadquarterCongregation:', error);
    return null;
  }
}
