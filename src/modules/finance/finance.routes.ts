import { Router } from 'express';
import { FinanceController } from './finance.controller';
import { ensureRole } from '../../middlewares/ensureRole';

const financeRoutes = Router();
const financeController = new FinanceController();

// Apenas Super Admin ou Finance Admin podem acessar
financeRoutes.use(ensureRole(['SUPER_ADMIN', 'FINANCE_ADMIN']));

// Transações
financeRoutes.post('/transactions', financeController.createTransaction.bind(financeController));
financeRoutes.get('/transactions', financeController.listTransactions.bind(financeController));
financeRoutes.put('/transactions/:id', financeController.updateTransaction.bind(financeController));
financeRoutes.delete('/transactions/:id', financeController.deleteTransaction.bind(financeController));

// Gastos Fixos
financeRoutes.post('/fixed-expenses', financeController.createFixedExpense.bind(financeController));
financeRoutes.get('/fixed-expenses', financeController.listFixedExpenses.bind(financeController));
financeRoutes.delete('/fixed-expenses/:id', financeController.deleteFixedExpense.bind(financeController));

// Dashboard Financeiro
financeRoutes.get('/dashboard', financeController.getDashboardMetrics.bind(financeController));
financeRoutes.get('/metrics', financeController.getDashboardMetrics.bind(financeController));

export { financeRoutes };
