import { Response } from 'express';
import { MESSAGES } from '../constants/messages';
import { logger } from './logger';

/**
 * Função para tratamento centralizado e seguro de erros da API.
 * NUNCA vaza detalhes de implementação, caminhos de arquivo, erros do Prisma ou stack traces ao cliente HTTP.
 */
export function handleApiError(res: Response, error: any, defaultMessage: string = MESSAGES.ERRORS.INTERNAL_SERVER_ERROR) {
  // 1. Log completo e detalhado via Pino logger (não-bloqueante e estruturado)
  logger.error({ err: error, defaultMessage }, `[API Error]: ${error?.message || defaultMessage}`);

  if (res.headersSent) {
    return;
  }

  // 2. Identificação de erros do Prisma e exceções técnicas do runtime
  const isPrismaError =
    error?.name?.includes('Prisma') ||
    error?.constructor?.name?.includes('Prisma') ||
    (typeof error?.code === 'string' && error.code.startsWith('P'));

  const isTechnicalError =
    error instanceof TypeError ||
    error instanceof ReferenceError ||
    error instanceof SyntaxError ||
    isPrismaError;

  const errorMessageStr = typeof error === 'string'
    ? error
    : (error instanceof Error ? error.message : String(error || ''));

  const containsSensitiveDetails =
    errorMessageStr.includes('prisma.') ||
    errorMessageStr.includes('invocation in') ||
    errorMessageStr.includes(':\\') ||
    errorMessageStr.includes(':/') ||
    errorMessageStr.includes('node_modules') ||
    errorMessageStr.includes('ECONNREFUSED') ||
    errorMessageStr.includes('PostgreSQL');

  // Se for erro técnico, erro do Prisma ou contiver caminhos/stack trace de arquivos, retorne 500 com mensagem genérica
  if (isTechnicalError || containsSensitiveDetails) {
    return res.status(500).json({ error: defaultMessage });
  }

  // 3. Se for uma mensagem tratada e segura da aplicação (curta e sem dados sensíveis)
  if (typeof error === 'string' && error.length < 300) {
    return res.status(400).json({ error });
  }

  if (error instanceof Error && error.message && error.message.length < 300) {
    return res.status(400).json({ error: error.message });
  }

  // Fallback de segurança (500 Internal Server Error)
  return res.status(500).json({ error: defaultMessage });
}

