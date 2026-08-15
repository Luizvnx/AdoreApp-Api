import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { routes } from './routes';
import { prisma } from './lib/prisma';

const app = express();
const PORT = process.env.PORT || 3333;

// Middlewares globais
app.use(cors());
app.use(express.json());


app.use('/api', routes);
app.use('/', routes);


app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});


app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Error]:', err);
  res.status(500).json({ error: 'Erro interno no servidor.' });
});


import { AuthController } from './modules/auth/auth.controller';

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
