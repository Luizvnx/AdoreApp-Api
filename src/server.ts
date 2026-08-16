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

// Configuração segura do CORS para cookies com credenciais
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem origin (como mobile apps, Postman ou ferramentas CLI)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error('Bloqueado pelo CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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
