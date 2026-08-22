import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    // Log level baseado no status da resposta HTTP
    const logData = {
      type: 'HTTP_REQUEST',
      method: req.method,
      url: req.originalUrl || req.url,
      status: statusCode,
      durationMs: duration,
      ip: req.ip || req.socket.remoteAddress,
      userId: req.user?.id || null,
      userAgent: req.get('user-agent')
    };

    if (statusCode >= 500) {
      logger.error(logData, `HTTP ${req.method} ${req.originalUrl} ${statusCode} - ${duration}ms`);
    } else if (statusCode >= 400) {
      logger.warn(logData, `HTTP ${req.method} ${req.originalUrl} ${statusCode} - ${duration}ms`);
    } else {
      logger.info(logData, `HTTP ${req.method} ${req.originalUrl} ${statusCode} - ${duration}ms`);
    }
  });

  next();
}
