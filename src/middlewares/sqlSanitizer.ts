import { Request, Response, NextFunction } from 'express';

// Padrões conhecidos de injeção SQL maliciosa em strings
const SQL_INJECTION_PATTERN = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|EXECUTE|TRUNCATE|UNION|DECLARE|SCRIPT)\b)|(--|;\s*$|\/\*|\*\/|' OR '|" OR '|' OR '1'='1'|" OR "1"="1")/i;

/**
 * Verifica recursivamente se o objeto contém valores não escalares (ex: objetos aninhados onde deveria ser string)
 * ou strings contendo fragmentos clássicos de SQL Injection.
 */
function isSuspiciousInput(val: any): boolean {
  if (val === null || val === undefined) return false;

  if (typeof val === 'string') {
    // Permite caracteres normais, mas bloqueia padrões destrutivos de SQL injection em requisições
    return SQL_INJECTION_PATTERN.test(val);
  }

  if (typeof val === 'object') {
    for (const key of Object.keys(val)) {
      // Bloqueia chaves que começam com $ ou operadores suspeitos
      if (key.startsWith('$') || key.includes(';') || isSuspiciousInput(val[key])) {
        return true;
      }
    }
  }

  return false;
}

export function sqlSanitizer(req: Request, res: Response, next: NextFunction): void {
  try {
    if (req.body && typeof req.body === 'object') {
      if (isSuspiciousInput(req.body)) {
        res.status(400).json({ error: 'Entrada de dados inválida ou suspeita de injeção detectada.' });
        return;
      }
    }

    if (req.query && typeof req.query === 'object') {
      if (isSuspiciousInput(req.query)) {
        res.status(400).json({ error: 'Parâmetros de busca inválidos ou suspeitos.' });
        return;
      }
    }

    if (req.params && typeof req.params === 'object') {
      if (isSuspiciousInput(req.params)) {
        res.status(400).json({ error: 'Identificador de rota inválido.' });
        return;
      }
    }

    next();
  } catch (err) {
    console.error('Erro na sanitização SQL:', err);
    res.status(400).json({ error: 'Formato de requisição inválido.' });
  }
}
