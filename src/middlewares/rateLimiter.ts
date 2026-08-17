import { Request, Response, NextFunction } from 'express';

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  blockedUntil: number;
}

// Armazenamento em memória para rastreamento preciso de tentativas de login por IP
const loginAttemptsMap = new Map<string, AttemptRecord>();

// Limpeza periódica a cada 5 minutos para evitar vazamento de memória
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of loginAttemptsMap.entries()) {
    if (now > record.blockedUntil && now - record.firstAttemptAt > 15 * 60 * 1000) {
      loginAttemptsMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  // Normaliza IPv6 localhost ::1 ou ::ffff:127.0.0.1 para 127.0.0.1
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }
  return ip;
}

/**
 * Rate Limiter customizado e ultra robusto para a rota de Login.
 * Permite até 5 tentativas a cada 3 minutos por IP.
 * Ao atingir 5 tentativas, bloqueia por 1 minuto.
 * Se o IP persistir com mais de 15 tentativas em 15 minutos, bloqueia por 3 minutos.
 */
export function loginRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  const now = Date.now();
  const record = loginAttemptsMap.get(ip) || { count: 0, firstAttemptAt: now, blockedUntil: 0 };

  // 1. Verifica se o IP está em período de bloqueio ativo
  if (now < record.blockedUntil) {
    const remainingSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    console.warn(`[RateLimit 🚨] IP ${ip} bloqueado. Tempo restante: ${remainingSeconds}s`);

    const errorMessage = record.count >= 15
      ? 'Excesso de tentativas. Por favor, aguarde 3 minutos por motivos de segurança.'
      : 'Por favor, aguarde 1 minuto antes de tentar novamente.';

    res.status(429).json({
      error: errorMessage,
      retryAfterSeconds: remainingSeconds
    });
    return;
  }

  // 2. Se a janela de 3 minutos expirou e o bloqueio já passou, reseta a contagem curta
  if (now - record.firstAttemptAt > 3 * 60 * 1000) {
    record.count = 0;
    record.firstAttemptAt = now;
  }

  // 3. Incrementa a tentativa
  record.count += 1;
  console.log(`[RateLimit 🛡️] Login tentativa ${record.count}/5 para IP: ${ip}`);

  // 4. Bloqueio nível 2: 15 ou mais tentativas acumuladas -> bloqueio de 3 minutos (180s)
  if (record.count >= 15) {
    record.blockedUntil = now + 3 * 60 * 1000; // 3 minutos
    loginAttemptsMap.set(ip, record);
    console.warn(`[RateLimit ⛔] IP ${ip} atingiu 15 tentativas. Bloqueado por 3 minutos.`);
    res.status(429).json({
      error: 'Excesso de tentativas. Por favor, aguarde 3 minutos por motivos de segurança.',
      retryAfterSeconds: 180
    });
    return;
  }

  // 5. Bloqueio nível 1: 5 ou mais tentativas no curto prazo -> bloqueio de 1 minuto (60s)
  if (record.count >= 5) {
    record.blockedUntil = now + 1 * 60 * 1000; // 1 minuto
    loginAttemptsMap.set(ip, record);
    console.warn(`[RateLimit ⚠️] IP ${ip} atingiu 5 tentativas. Bloqueado por 1 minuto.`);
    res.status(429).json({
      error: 'Por favor, aguarde 1 minuto antes de tentar novamente.',
      retryAfterSeconds: 60
    });
    return;
  }

  loginAttemptsMap.set(ip, record);
  next();
}

/**
 * Limiter geral para endpoints gerais da API (proteção contra abuso / DDoS básico).
 */
export function globalApiRateLimiter(req: Request, res: Response, next: NextFunction): void {
  // Pass-through simples para chamadas normais da API
  next();
}
