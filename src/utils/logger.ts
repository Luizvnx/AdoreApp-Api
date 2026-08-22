import pino from 'pino';
import fs from 'fs';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

// Diretório de logs para produção
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
  } catch (err) {
    // Silencioso se não conseguir criar pasta
  }
}

const logFilePath = path.join(logDir, 'app.log');

// Configuração de transporte assíncrono e não-bloqueante
let transport;

if (!isProduction) {
  transport = pino.transport({
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname'
    }
  });
} else {
  // Em produção, grava no arquivo logs/app.log e stdout de forma assíncrona (stream)
  transport = pino.transport({
    targets: [
      {
        target: 'pino/file',
        options: { destination: logFilePath, mkdir: true },
        level: logLevel
      },
      {
        target: 'pino/file',
        options: { destination: 1 }, // stdout (1)
        level: logLevel
      }
    ]
  });
}

export const logger = pino(
  {
    level: logLevel,
    base: isProduction ? { pid: process.pid } : undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  transport
);

/**
 * Utilitário para registrar movimentações e auditoria de forma estruturada.
 */
export function logAuditEvent(action: string, meta: { userId?: string; email?: string; congregationId?: string; details?: any }) {
  logger.info({
    type: 'AUDIT',
    action,
    userId: meta.userId || 'ANONYMOUS',
    email: meta.email || null,
    congregationId: meta.congregationId || null,
    details: meta.details || {},
    timestamp: new Date().toISOString()
  }, `[AUDIT] ${action}`);
}
