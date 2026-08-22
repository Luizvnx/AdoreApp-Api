import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { handleApiError } from '../../utils/errorHandler';
import { MESSAGES } from '../../constants/messages';
import { logAuditEvent } from '../../utils/logger';

export class FinanceController {

  // Cria uma nova transação financeira de forma segura e atômica
  async createTransaction(req: Request, res: Response) {
    try {
      const { title, type, amount, date, category, paymentMethod, notes, serviceId, accountId } = req.body;
      const createdById = req.user?.id;

      if (!title || !type || amount === undefined || !date || !category) {
        return res.status(400).json({ error: MESSAGES.ERRORS.FINANCE_REQUIRED_FIELDS });
      }

      const numericAmount = Number(amount);
      if (numericAmount <= 0) {
        return res.status(400).json({ error: MESSAGES.ERRORS.FINANCE_INVALID_AMOUNT });
      }

      const validPaymentMethod = paymentMethod || 'PIX';

      // Determina a congregação (SUPER_ADMIN pode informar; outros usam estritamente a sua congregação)
      const isSuperAdmin = req.user?.roles?.includes('SUPER_ADMIN');
      const congregationId = (isSuperAdmin && req.body.congregationId)
        ? req.body.congregationId
        : req.user?.congregationId;

      // Executa a busca/criação da conta e a transação dentro do $transaction para garantir Atomicidade (ACID)
      const transactionResult = await prisma.$transaction(async (tx) => {

        let targetAccountId = accountId;

        // 1. Garante que a conta existe usando Upsert (evita Race Conditions)
        if (!targetAccountId) {
          const defaultAccount = await tx.financialAccount.upsert({
            where: { name: 'Caixa Geral' },
            update: {},
            create: { name: 'Caixa Geral', description: 'Caixa principal da igreja', congregationId }
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
            paymentMethod: validPaymentMethod,
            notes,
            serviceId,
            accountId: targetAccountId,
            congregationId,
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

      logAuditEvent('FINANCIAL_TRANSACTION_CREATED', {
        userId: createdById,
        congregationId,
        details: { id: transactionResult.id, title, type, amount: numericAmount, category }
      });

      return res.status(201).json(transactionResult);
    } catch (error: any) {
      return handleApiError(res, error, MESSAGES.ERRORS.FINANCE_CREATE_FAILED);
    }
  }

  // Atualiza uma transação existente com histórico (Diff)
  async updateTransaction(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { title, type, amount, date, category, paymentMethod, notes, serviceId, accountId } = req.body;
      const editedById = req.user?.id;

      const numericAmount = Number(amount);
      if (numericAmount <= 0) {
        return res.status(400).json({ error: 'O valor da transação deve ser maior que zero.' });
      }

      const validPaymentMethod = paymentMethod || 'PIX';

      const transactionResult = await prisma.$transaction(async (tx) => {
        const oldTransaction = await tx.financialTransaction.findUnique({
          where: { id },
          include: { account: true }
        });

        if (!oldTransaction) {
          throw new Error('NOT_FOUND');
        }

        const isSuperAdmin = req.user?.roles?.includes('SUPER_ADMIN');
        if (!isSuperAdmin && oldTransaction.congregationId !== req.user?.congregationId) {
          throw new Error('FORBIDDEN');
        }

        // Gera o diff (o que mudou)
        const changes: Record<string, { old: any; new: any }> = {};
        if (oldTransaction.title !== title) changes.title = { old: oldTransaction.title, new: title };
        if (oldTransaction.type !== type) changes.type = { old: oldTransaction.type, new: type };
        if (oldTransaction.amount !== numericAmount) changes.amount = { old: oldTransaction.amount, new: numericAmount };
        if (oldTransaction.category !== category) changes.category = { old: oldTransaction.category, new: category };
        if ((oldTransaction as any).paymentMethod !== validPaymentMethod) changes.paymentMethod = { old: (oldTransaction as any).paymentMethod, new: validPaymentMethod };
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

        // Busca o nome do usuário que efetuou a alteração
        const editor = editedById
          ? await tx.user.findUnique({ where: { id: editedById }, select: { fullName: true } })
          : null;
        const editedByName = editor?.fullName || (req.user as any)?.name || 'Usuário';

        // Prepara o registro do histórico
        const historyEntry = {
          editedAt: new Date().toISOString(),
          editedById,
          editedByName,
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
            paymentMethod: validPaymentMethod,
            notes,
            serviceId,
            accountId: accountId || oldTransaction.accountId,
            editedById,
            editHistory: newHistory
          },
          include: {
            createdBy: { select: { fullName: true } },
            editedBy: { select: { fullName: true } }
          }
        });

        return updatedTransaction;
      });

      logAuditEvent('FINANCIAL_TRANSACTION_UPDATED', {
        userId: editedById,
        details: { id, title, amount: numericAmount }
      });

      return res.json(transactionResult);
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        return res.status(404).json({ error: MESSAGES.ERRORS.FINANCE_NOT_FOUND });
      }
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: MESSAGES.ERRORS.FINANCE_EDIT_FORBIDDEN });
      }
      return handleApiError(res, error, MESSAGES.ERRORS.FINANCE_UPDATE_FAILED);
    }
  }

  // Lista transações com suporte a relatórios (Tipo, Período, Datas, Forma de Pagamento)
  async listTransactions(req: Request, res: Response) {
    try {
      const month = req.query.month as string;
      const year = req.query.year as string;
      const category = req.query.category as string;
      const type = req.query.type as string;
      const paymentMethod = req.query.paymentMethod as string;
      const period = req.query.period as string;
      const startDateQuery = req.query.startDate as string;
      const endDateQuery = req.query.endDate as string;

      let filter: any = {};

      // Isolamento por Congregação (Segurança: usuários comuns só acessam sua congregação)
      const user = req.user;
      const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN');
      const paramCongregationId = req.query.congregationId as string;

      if (isSuperAdmin) {
        if (paramCongregationId && paramCongregationId !== 'ALL') {
          filter.congregationId = paramCongregationId;
        }
      } else {
        if (user?.congregationId) {
          filter.congregationId = user.congregationId;
        }
      }

      // Filtro de Data
      if (startDateQuery && endDateQuery) {
        const start = new Date(startDateQuery);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDateQuery);
        end.setHours(23, 59, 59, 999);
        filter.date = { gte: start, lte: end };
      } else if (period === 'WEEK') {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Domingo
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        filter.date = { gte: startOfWeek, lte: endOfWeek };
      } else if (period === 'YEAR' && year) {
        const startOfYear = new Date(Number(year), 0, 1, 0, 0, 0);
        const endOfYear = new Date(Number(year), 11, 31, 23, 59, 59);
        filter.date = { gte: startOfYear, lte: endOfYear };
      } else if (month && year) {
        const startDate = new Date(Number(year), Number(month) - 1, 1, 0, 0, 0);
        const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
        filter.date = { gte: startDate, lte: endDate };
      }

      // Filtro de Categoria
      if (category && category !== 'ALL') {
        filter.category = category;
      }

      // Filtro de Tipo (Entradas / Saídas)
      if (type && type !== 'ALL') {
        filter.type = type;
      }

      // Filtro de Forma de Pagamento (Pix, Dinheiro, Débito, Crédito, etc)
      if (paymentMethod && paymentMethod !== 'ALL') {
        filter.paymentMethod = paymentMethod;
      }

      const transactions = await prisma.financialTransaction.findMany({
        where: filter,
        orderBy: { date: 'desc' },
        include: {
          service: { select: { serviceName: true } },
          createdBy: { select: { fullName: true } },
          editedBy: { select: { fullName: true } }
        }
      });

      return res.json(transactions);
    } catch (error: any) {
      return handleApiError(res, error, 'Erro ao listar transações.');
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

        const isSuperAdmin = req.user?.roles?.includes('SUPER_ADMIN');
        if (!isSuperAdmin && transaction.congregationId !== req.user?.congregationId) {
          throw new Error('FORBIDDEN');
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

      logAuditEvent('FINANCIAL_TRANSACTION_DELETED', {
        userId: req.user?.id,
        details: { id }
      });

      return res.json({ message: MESSAGES.SUCCESS.TRANSACTION_DELETED });
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        return res.status(404).json({ error: MESSAGES.ERRORS.FINANCE_NOT_FOUND });
      }
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: MESSAGES.ERRORS.FINANCE_DELETE_FORBIDDEN });
      }
      return handleApiError(res, error, MESSAGES.ERRORS.FINANCE_DELETE_FAILED);
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
      const paramCongregationId = req.query.congregationId as string;

      const currentDate = new Date();
      const targetMonth = month ? Number(month) : currentDate.getMonth() + 1;
      const targetYear = year ? Number(year) : currentDate.getFullYear();

      const startDate = new Date(targetYear, targetMonth - 1, 1);
      const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

      // Trava de segurança para congregações
      const user = req.user;
      const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN');

      let congregationFilter: any = {};
      if (isSuperAdmin) {
        if (paramCongregationId && paramCongregationId !== 'ALL') {
          congregationFilter.congregationId = paramCongregationId;
        }
      } else {
        if (user?.congregationId) {
          congregationFilter.congregationId = user.congregationId;
        }
      }

      // 1. Transações do mês selecionado
      const transactions = await prisma.financialTransaction.findMany({
        where: {
          ...congregationFilter,
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

      // 2. Cálculo do Saldo Total em Caixa (Consolidado de todas as transações ou saldo das contas)
      const allTimeIncomeAgg = await prisma.financialTransaction.aggregate({
        _sum: { amount: true },
        where: { ...congregationFilter, type: 'INCOME' }
      });
      const allTimeExpenseAgg = await prisma.financialTransaction.aggregate({
        _sum: { amount: true },
        where: { ...congregationFilter, type: 'EXPENSE' }
      });

      const accounts = await prisma.financialAccount.findMany({
        where: congregationFilter
      });
      const accountsBalance = accounts.reduce((acc, a) => acc + a.balance, 0);

      const netTransactionsBalance = (allTimeIncomeAgg._sum.amount || 0) - (allTimeExpenseAgg._sum.amount || 0);
      const currentBalance = accountsBalance > 0 ? accountsBalance : netTransactionsBalance;

      // 3. Gastos fixos projetados
      const fixedExpenses = await prisma.fixedExpense.findMany({
        where: { ...congregationFilter, isActive: true }
      });
      const projectedFixedExpenses = fixedExpenses.reduce((acc, curr) => acc + curr.amount, 0);

      // 4. Histórico dos últimos 6 meses (para gráficos)
      const monthlyHistory = [];
      for (let i = 5; i >= 0; i--) {
        const mDate = new Date(targetYear, targetMonth - 1 - i, 1);
        const mStart = new Date(mDate.getFullYear(), mDate.getMonth(), 1);
        const mEnd = new Date(mDate.getFullYear(), mDate.getMonth() + 1, 0, 23, 59, 59);

        const mTrans = await prisma.financialTransaction.groupBy({
          by: ['type'],
          where: {
            ...congregationFilter,
            date: { gte: mStart, lte: mEnd }
          },
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
