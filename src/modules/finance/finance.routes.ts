import { Router } from 'express';
import { FinanceController } from './finance.controller';
import { ensureRole } from '../../middlewares/ensureRole';

const financeRoutes = Router();
const financeController = new FinanceController();

// Roles de leitura (Diretoria pode ver, mas não editar)
const readRoles = ['SUPER_ADMIN', 'FINANCE_ADMIN', 'PASTOR', 'DIRECTOR'];
// Roles de escrita
const writeRoles = ['SUPER_ADMIN', 'FINANCE_ADMIN', 'PASTOR'];

// Transações
financeRoutes.post('/transactions', ensureRole(writeRoles), financeController.createTransaction.bind(financeController));
financeRoutes.get('/transactions', ensureRole(readRoles), financeController.listTransactions.bind(financeController));
financeRoutes.put('/transactions/:id', ensureRole(writeRoles), financeController.updateTransaction.bind(financeController));
financeRoutes.delete('/transactions/:id', ensureRole(writeRoles), financeController.deleteTransaction.bind(financeController));

// Gastos Fixos
financeRoutes.post('/fixed-expenses', ensureRole(writeRoles), financeController.createFixedExpense.bind(financeController));
financeRoutes.get('/fixed-expenses', ensureRole(readRoles), financeController.listFixedExpenses.bind(financeController));
financeRoutes.delete('/fixed-expenses/:id', ensureRole(writeRoles), financeController.deleteFixedExpense.bind(financeController));

// Dashboard Financeiro
financeRoutes.get('/dashboard', ensureRole(readRoles), financeController.getDashboardMetrics.bind(financeController));
financeRoutes.get('/metrics', ensureRole(readRoles), financeController.getDashboardMetrics.bind(financeController));

export { financeRoutes };
