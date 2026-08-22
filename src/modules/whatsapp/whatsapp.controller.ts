import { Request, Response } from 'express';
import { whatsAppService } from './whatsapp.service';
import { MESSAGES } from '../../constants/messages';
import { handleApiError } from '../../utils/errorHandler';
import { logAuditEvent } from '../../utils/logger';

export class WhatsAppController {
  // Retorna o status de conexão da instância no Evolution API
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await whatsAppService.getConnectionStatus();
      res.json(status);
    } catch (error: any) {
      handleApiError(res, error, MESSAGES.ERRORS.WHATSAPP_STATUS_FAILED);
    }
  }

  // Solicita um novo QR Code para pareamento
  async getQRCode(req: Request, res: Response): Promise<void> {
    try {
      const qrData = await whatsAppService.connectInstance();
      res.json(qrData);
    } catch (error: any) {
      handleApiError(res, error, MESSAGES.ERRORS.WHATSAPP_QRCODE_FAILED);
    }
  }

  // Desconecta a sessão atual
  async disconnect(req: Request, res: Response): Promise<void> {
    try {
      const success = await whatsAppService.disconnectInstance();
      logAuditEvent('WHATSAPP_DISCONNECTED', { userId: req.user?.id });
      res.json({ success, message: success ? 'WhatsApp desconectado com sucesso.' : 'Falha ao desconectar.' });
    } catch (error: any) {
      handleApiError(res, error, MESSAGES.ERRORS.WHATSAPP_DISCONNECT_FAILED);
    }
  }

  // Retorna o modelo do arquivo de texto de mensagem programada
  async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      const content = whatsAppService.getWelcomeTemplate();
      res.json({ content });
    } catch (error: any) {
      handleApiError(res, error, MESSAGES.ERRORS.WHATSAPP_READ_TEMPLATE_FAILED);
    }
  }

  // Atualiza o conteúdo do modelo do arquivo de texto
  async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { content } = req.body;
      if (typeof content !== 'string') {
        res.status(400).json({ error: MESSAGES.ERRORS.WHATSAPP_INVALID_TEMPLATE });
        return;
      }
      whatsAppService.updateWelcomeTemplate(content);
      logAuditEvent('WHATSAPP_TEMPLATE_UPDATED', { userId: req.user?.id });
      res.json({ message: 'Modelo de mensagem programada salvo com sucesso!' });
    } catch (error: any) {
      handleApiError(res, error, MESSAGES.ERRORS.WHATSAPP_SAVE_TEMPLATE_FAILED);
    }
  }

  // Dispara uma mensagem de teste
  async sendTestMessage(req: Request, res: Response): Promise<void> {
    try {
      const { phone, text } = req.body;
      if (!phone || !text) {
        res.status(400).json({ error: MESSAGES.ERRORS.WHATSAPP_TEST_REQUIRED });
        return;
      }
      const result = await whatsAppService.sendTextMessage(phone, text);
      if (result.success) {
        logAuditEvent('WHATSAPP_TEST_SENT', { userId: req.user?.id, details: { phone } });
        res.json({ message: 'Mensagem de teste enviada com sucesso!' });
      } else {
        res.status(400).json({ error: result.error || MESSAGES.ERRORS.WHATSAPP_TEST_FAILED });
      }
    } catch (error: any) {
      handleApiError(res, error, MESSAGES.ERRORS.WHATSAPP_TEST_FAILED);
    }
  }
}

