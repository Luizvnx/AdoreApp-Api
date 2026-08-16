import rateLimit from 'express-rate-limit';

/**
 * Nível 1: Rate Limiter principal para a rota de Login.
 * Limita a 5 tentativas a cada 1 minuto por IP.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 5, // Máximo 5 tentativas por minuto
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Por favor, aguarde 1 minuto antes de tentar novamente.',
    retryAfterSeconds: 60,
  },
  statusCode: 429,
});

/**
 * Nível 2: Rate Limiter estrito / bloqueio estendido para tentativas persistentes.
 * Após 15 tentativas acumuladas em um período de 15 minutos, bloqueia por 3 minutos adicionais.
 */
export const loginStrictLockoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Janela de observação de 15 minutos
  max: 15, // Máximo 15 tentativas no total
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Excesso de tentativas. Por favor, aguarde 3 minutos por motivos de segurança.',
    retryAfterSeconds: 180,
  },
  statusCode: 429,
});

/**
 * Limiter geral para endpoints gerais da API (proteção contra abuso / DDoS básico).
 * Limita a 100 requisições por minuto por IP.
 */
export const globalApiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Limite de requisições excedido. Por favor, reduza a frequência de chamadas.',
  },
  statusCode: 429,
});
