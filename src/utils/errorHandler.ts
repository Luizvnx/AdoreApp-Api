import { Response } from 'express';
import { MESSAGES } from '../constants/messages';

export function handleApiError(res: Response, error: any, defaultMessage: string = MESSAGES.ERRORS.INTERNAL_SERVER_ERROR) {
  console.error('[API Error]:', error);

  // If error is already a string, just send it
  if (typeof error === 'string') {
    return res.status(400).json({ error });
  }

  // If it's a known format (like an Error object with a message we set ourselves)
  if (error instanceof Error) {
    // Some prisma errors might leak if not careful, but generally we want to return the error message if it's safe.
    // Assuming messages like "Falha ao cadastrar visitante" are safe.
    return res.status(400).json({ error: error.message || defaultMessage });
  }

  // Fallback
  return res.status(500).json({ error: defaultMessage });
}
