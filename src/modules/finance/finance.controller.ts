import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

export class FinanceController {
  
  // Cria uma nova transação financeira de forma segura e atômica
  async createTransaction(req: Request, res: Response) {
    try {
      const { title, type, amount, date, category, notes, serviceId, accountId } = req.body;
      const createdById = req.user?.id;

      if (!title || !type || amount === undefined || !date || !category) {
        return res.status(400).json({ error: 'Campos obrigatórios: title, type, amount, date, category.' });
      }

      const numericAmount = Number(amount);
      if (numericAmount <= 0) {
        return res.status(400).json({ error: 'O valor da transação deve ser maior que zero.' });
      }

      // Executa a busca/criação da conta e a transação dentro do $transaction para garantir Atomicidade (ACID)
      const transactionResult = await prisma.$transaction(async (tx) => {
        
        let targetAccountId = accountId;
        
        // 1. Garante que a conta existe usando Upsert (evita Race Conditions)
        if (!targetAccountId) {
          const defaultAccount = await tx.financialAccount.upsert({
            where: { name: 'Caixa Geral' },
            update: {},
            create: { name: 'Caixa Geral', description: 'Caixa principal da igreja' }
          });
          targetAccountId = defaultAccount.id;
        }

        // 2. Cria o registro da transação
        const transaction = await tx.financialTransaction.create({
          data: {
            title,
            type,
            amount: numericAmount,
            date: new Date(date),
            category,
            notes,
            serviceId,
            accountId: targetAccountId,
            createdById
          }
        });

        // 3. Atualiza o saldo consolidado da conta
        const balanceChange = type === 'INCOME' ? numericAmount : -numericAmount;
        
        await tx.financialAccount.update({
          where: { id: targetAccountId },
          data: { balance: { increment: balanceChange } }
        });

        return transaction;
      });

      return res.status(201).json(transactionResult);
    } catch (error: any) {
      console.error('Erro ao criar transação financeira:', error);
      return res.status(500).json({ error: 'Erro ao cadastrar transação.', details: error.message });
    }
  }

  // Atualiza uma transação existente com histórico (Diff)
  async updateTransaction(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { title, type, amount, date, category, notes, serviceId, accountId } = req.body;
      const editedById = req.user?.id;

      const numericAmount = Number(amount);
      if (numericAmount <= 0) {
        return res.status(400).json({ error: 'O valor da transação deve ser maior que zero.' });
      }

      const transactionResult = await prisma.$transaction(async (tx) => {
        const oldTransaction = await tx.financialTransaction.findUnique({
          where: { id },
          include: { account: true }
        });

        if (!oldTransaction) {
          throw new Error('NOT_FOUND');
        }

        // Gera o diff (o que mudou)
        const changes: Record<string, { old: any; new: any }> = {};
        if (oldTransaction.title !== title) changes.title = { old: oldTransaction.title, new: title };
        if (oldTransaction.type !== type) changes.type = { old: oldTransaction.type, new: type };
        if (oldTransaction.amount !== numericAmount) changes.amount = { old: oldTransaction.amount, new: numericAmount };
        if (oldTransaction.category !== category) changes.category = { old: oldTransaction.category, new: category };
        if (oldTransaction.notes !== notes) changes.notes = { old: oldTransaction.notes, new: notes };
        
        // Se a data mudou (comparação de datas é mais chata)
        const newDate = new Date(date);
        if (oldTransaction.date.getTime() !== newDate.getTime()) {
          changes.date = { old: oldTransaction.date, new: newDate };
        }

        // Se nada mudou, apenas retorna a transação original
        if (Object.keys(changes).length === 0) {
          return oldTransaction;
        }

        // Prepara o registro do histórico
        const historyEntry = {
          editedAt: new Date().toISOString(),
          editedById,
          changes
        };

        const currentHistory = oldTransaction.editHistory as any[] || [];
        const newHistory = [...currentHistory, historyEntry];

        // Se o valor ou tipo mudou, ajusta o saldo do Caixa
        if (changes.amount || changes.type) {
          // 1. Reverte o saldo antigo
          const revertAmount = oldTransaction.type === 'INCOME' ? -oldTransaction.amount : oldTransaction.amount;
          
          // 2. Aplica o saldo novo
          const applyAmount = type === 'INCOME' ? numericAmount : -numericAmount;

          const totalBalanceChange = revertAmount + applyAmount;

          await tx.financialAccount.update({
            where: { id: oldTransaction.accountId },
            data: { balance: { increment: totalBalanceChange } }
          });
        }

        // Atualiza a transação
        const updatedTransaction = await tx.financialTransaction.update({
          where: { id },
          data: {
            title,
            type,
            amount: numericAmount,
            date: newDate,
            category,
            notes,
            serviceId,
            accountId: accountId || oldTransaction.accountId,
            editedById,
            editHistory: newHistory
          }
        });

        return updatedTransaction;
      });

      return res.json(transactionResult);
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Transação não encontrada.' });
      }
      console.error('Erro ao editar transação:', error);
      return res.status(500).json({ error: 'Erro ao editar transação.', details: error.message });
    }
  }

  // Lista transações (com filtro opcional por mês/ano)
  async listTransactions(req: Request, res: Response) {
    try {
      console.log("[FINANCE] listTransactions called");
      const month = req.query.month as string;
      const year = req.query.year as string;
      const category = req.query.category as string;
      
      let dateFilter: any = {};
      if (month && year) {
        const startDate = new Date(Number(year), Number(month) - 1, 1);
        const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59); // último dia do mês
        dateFilter.date = {
          gte: startDate,
          lte: endDate
        };
      }

      if (category && category !== 'ALL') {
        dateFilter.category = category;
      }

      const transactions = await prisma.financialTransaction.findMany({
        where: dateFilter,
        orderBy: { date: 'desc' },
        include: {
          service: { select: { serviceName: true } },
          createdBy: { select: { fullName: true } },
          editedBy: { select: { fullName: true } }
        }
      });

      return res.json(transactions);
    } catch (error: any) {
      console.error("ERRO LISTAR TRANSACOES:", error);
      return res.status(500).json({ error: 'Erro ao listar transações.', details: error.message || error });
    }
  }

  // Exclui uma transação de forma segura
  async deleteTransaction(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      
      await prisma.$transaction(async (tx) => {
        const transaction = await tx.financialTransaction.findUnique({ where: { id } });
        
        if (!transaction) {
          throw new Error('NOT_FOUND');
        }

        // Reverte o saldo na conta associada
        const balanceChange = transaction.type === 'INCOME' ? -transaction.amount : transaction.amount;
        
        await tx.financialAccount.update({
          where: { id: transaction.accountId },
          data: { balance: { increment: balanceChange } }
        });

        // Remove a transação
        await tx.financialTransaction.delete({ where: { id } });
      });

      return res.json({ message: 'Transação excluída com sucesso.' });
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Transação não encontrada.' });
      }
      return res.status(500).json({ error: 'Erro ao excluir transação.' });
    }
  }

  // Cria um gasto fixo
  async createFixedExpense(req: Request, res: Response) {
    try {
      const { title, amount, dueDate, notes } = req.body;
      const createdById = req.user?.id;

      if (!title || !amount || !dueDate) {
        return res.status(400).json({ error: 'Campos obrigatórios: title, amount, dueDate.' });
      }

      const fixedExpense = await prisma.fixedExpense.create({
        data: {
          title,
          amount: Number(amount),
          dueDate: Number(dueDate),
          notes,
          createdById
        }
      });

      return res.status(201).json(fixedExpense);
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao cadastrar gasto fixo.' });
    }
  }

  // Lista gastos fixos
  async listFixedExpenses(req: Request, res: Response) {
    try {
      const fixedExpenses = await prisma.fixedExpense.findMany({
        orderBy: { dueDate: 'asc' }
      });
      return res.json(fixedExpenses);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao listar gastos fixos.' });
    }
  }

  async deleteFixedExpense(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await prisma.fixedExpense.delete({ where: { id } });
      return res.json({ message: 'Gasto fixo excluído com sucesso.' });
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao excluir gasto fixo.' });
    }
  }

  // Obtém as métricas do painel financeiro (Dashboard)
  async getDashboardMetrics(req: Request, res: Response) {
    try {
      const month = req.query.month as string;
      const year = req.query.year as string;
      const currentDate = new Date();
      const targetMonth = month ? Number(month) : currentDate.getMonth() + 1;
      const targetYear = year ? Number(year) : currentDate.getFullYear();

      const startDate = new Date(targetYear, targetMonth - 1, 1);
      const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

      // Transações do mês
      const transactions = await prisma.financialTransaction.findMany({
        where: {
          date: { gte: startDate, lte: endDate }
        }
      });

      let totalIncome = 0;
      let totalExpense = 0;
      let fixedExpenseTotal = 0;
      let variableExpenseTotal = 0;

      transactions.forEach(t => {
        if (t.type === 'INCOME') totalIncome += t.amount;
        if (t.type === 'EXPENSE') {
          totalExpense += t.amount;
          if (t.category === 'GASTO_FIXO') fixedExpenseTotal += t.amount;
          else variableExpenseTotal += t.amount;
        }
      });

      // Saldo da Conta Principal
      const defaultAccount = await prisma.financialAccount.findFirst();
      const currentBalance = defaultAccount ? defaultAccount.balance : 0;

      // Gastos fixos projetados (da tabela FixedExpense)
      const fixedExpenses = await prisma.fixedExpense.findMany({ where: { isActive: true } });
      const projectedFixedExpenses = fixedExpenses.reduce((acc, curr) => acc + curr.amount, 0);

      // Histórico dos últimos 6 meses (para gráfico de barras)
      const monthlyHistory = [];
      for (let i = 5; i >= 0; i--) {
        const mDate = new Date(targetYear, targetMonth - 1 - i, 1);
        const mStart = new Date(mDate.getFullYear(), mDate.getMonth(), 1);
        const mEnd = new Date(mDate.getFullYear(), mDate.getMonth() + 1, 0, 23, 59, 59);

        const mTrans = await prisma.financialTransaction.groupBy({
          by: ['type'],
          where: { date: { gte: mStart, lte: mEnd } },
          _sum: { amount: true }
        });

        let mIncome = 0;
        let mExpense = 0;
        mTrans.forEach(g => {
          if (g.type === 'INCOME') mIncome = g._sum.amount || 0;
          if (g.type === 'EXPENSE') mExpense = g._sum.amount || 0;
        });

        monthlyHistory.push({
          month: `${String(mStart.getMonth() + 1).padStart(2, '0')}/${mStart.getFullYear()}`,
          income: mIncome,
          expense: mExpense
        });
      }

      return res.json({
        period: `${String(targetMonth).padStart(2, '0')}/${targetYear}`,
        currentBalance,
        totalIncome,
        totalExpense,
        fixedExpenseTotal,
        variableExpenseTotal,
        projectedFixedExpenses,
        monthlyHistory
      });

    } catch (error) {
      console.error('Erro ao buscar métricas financeiras:', error);
      return res.status(500).json({ error: 'Erro ao carregar dashboard financeiro.' });
    }
  }
}
