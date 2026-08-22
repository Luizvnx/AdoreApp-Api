import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { routes } from './routes';
import { prisma } from './lib/prisma';
import { sqlSanitizer } from './middlewares/sqlSanitizer';
import { globalApiRateLimiter } from './middlewares/rateLimiter';
import { requestLogger } from './middlewares/requestLogger';
import { logger } from './utils/logger';
import { AuthController } from './modules/auth/auth.controller';
import { MESSAGES } from './constants/messages';
import { handleApiError } from './utils/errorHandler';

const app = express();
const PORT = process.env.PORT || 3333;

// Habilita 'trust proxy' para que o Express reconheça os cabeçalhos HTTPS do Railway / Cloudflare / Vercel
app.set('trust proxy', 1);

// Normalização da URL do Frontend para CORS
const configuredFrontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.trim().replace(/\/$/, '') : '';

app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem header origin (como chamadas backend-to-backend, Postman, mobile ou cURL)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.trim().replace(/\/$/, '').toLowerCase();
    const cleanFrontendUrl = configuredFrontendUrl.toLowerCase();

    // Aceita qualquer porta de localhost ou 127.0.0.1 (ex: :5173, :5174, :3000, :4173)
    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin);

    // Se bater com FRONTEND_URL configurado nas env vars
    const isConfiguredUrl = cleanFrontendUrl && cleanOrigin === cleanFrontendUrl;

    // Domínios de hospedagem de frontend ou API (Vercel, Netlify, Railway, Render)
    const isCloudHost =
      cleanOrigin.endsWith('.railway.app') ||
      cleanOrigin.endsWith('.up.railway.app') ||
      cleanOrigin.endsWith('.vercel.app') ||
      cleanOrigin.endsWith('.netlify.app') ||
      cleanOrigin.endsWith('.onrender.com');

    if (isLocalhost || isConfiguredUrl || isCloudHost || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    logger.warn(`[CORS Warning] Origem não autorizada bloqueada: "${origin}"`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie']
}));

// Parser de Cookies HttpOnly
app.use(cookieParser());

// Parser de JSON
app.use(express.json());

// Logger de requisições HTTP de alta performance (não-bloqueante)
app.use(requestLogger);

// Proteção global contra SQL Injection e manipulação de parâmetros
app.use(sqlSanitizer);

// Rate Limiter global da API
app.use('/api', globalApiRateLimiter);

// Rotas da API
app.use('/api', routes);
app.use('/', routes);

// Middleware 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: MESSAGES.ERRORS.ROUTE_NOT_FOUND });
});

// Middleware de tratamento global de erros
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  handleApiError(res, err);
});

import { ensureHeadquarterCongregation } from './lib/seedCongregation';

const server = app.listen(PORT, async () => {
  logger.info(`🚀 Servidor rodando na porta ${PORT}`);
  logger.info(`🔗 Healthcheck disponível em: http://localhost:${PORT}/health`);
  
  await AuthController.seedInitialUserIfNeeded();
  await ensureHeadquarterCongregation();
});

const gracefulShutdown = async () => {
  logger.info('⏳ Encerrando servidor e conexões do Prisma...');
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('✅ Servidor finalizado com sucesso.');
    process.exit(0);
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

