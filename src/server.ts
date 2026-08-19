import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { routes } from './routes';
import { prisma } from './lib/prisma';
import { sqlSanitizer } from './middlewares/sqlSanitizer';
import { globalApiRateLimiter } from './middlewares/rateLimiter';
import { AuthController } from './modules/auth/auth.controller';

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

    console.warn(`[CORS Warning] Origem não autorizada bloqueada: "${origin}"`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie', 'x-override-role']
}));

// Parser de Cookies HttpOnly
app.use(cookieParser());

// Parser de JSON
app.use(express.json());

// Proteção global contra SQL Injection e manipulação de parâmetros
app.use(sqlSanitizer);

// Rate Limiter global da API
app.use('/api', globalApiRateLimiter);

// Rotas da API
app.use('/api', routes);
app.use('/', routes);

// Middleware 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// Middleware de tratamento global de erros
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Error]:', err);
  res.status(500).json({ error: 'Erro interno no servidor.' });
});

const server = app.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔗 Healthcheck disponível em: http://localhost:${PORT}/health`);
  console.log(`🔗 API Autenticação em: http://localhost:${PORT}/api/auth/login`);
  console.log(`🔗 API Visitantes disponível em: http://localhost:${PORT}/api/visitors`);
  
  await AuthController.seedInitialUserIfNeeded();
});

const gracefulShutdown = async () => {
  console.log('\n⏳ Encerrando servidor e conexões do Prisma...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('✅ Servidor finalizado com sucesso.');
    process.exit(0);
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
