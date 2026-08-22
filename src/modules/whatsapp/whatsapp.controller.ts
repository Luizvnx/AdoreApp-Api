import { Request, Response } from 'express';
import { whatsAppService } from './whatsapp.service';

export class WhatsAppController {
  // Retorna o status de conexão da instância no Evolution API
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await whatsAppService.getConnectionStatus();
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: 'Erro ao verificar status do WhatsApp.' });
    }
  }

  // Solicita um novo QR Code para pareamento
  async getQRCode(req: Request, res: Response): Promise<void> {
    try {
      const qrData = await whatsAppService.connectInstance();
      res.json(qrData);
    } catch (error: any) {
      res.status(500).json({ error: 'Erro ao gerar QR Code do WhatsApp.' });
    }
  }

  // Desconecta a sessão atual
  async disconnect(req: Request, res: Response): Promise<void> {
    try {
      const success = await whatsAppService.disconnectInstance();
      res.json({ success, message: success ? 'WhatsApp desconectado com sucesso.' : 'Falha ao desconectar.' });
    } catch (error: any) {
      res.status(500).json({ error: 'Erro ao desconectar WhatsApp.' });
    }
  }

  // Retorna o modelo do arquivo de texto de mensagem programada
  async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      const content = whatsAppService.getWelcomeTemplate();
      res.json({ content });
    } catch (error: any) {
      res.status(500).json({ error: 'Erro ao ler modelo de mensagem.' });
    }
  }

  // Atualiza o conteúdo do modelo do arquivo de texto
  async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { content } = req.body;
      if (typeof content !== 'string') {
        res.status(400).json({ error: 'Conteúdo da mensagem inválido.' });
        return;
      }
      whatsAppService.updateWelcomeTemplate(content);
      res.json({ message: 'Modelo de mensagem programada salvo com sucesso!' });
    } catch (error: any) {
      res.status(500).json({ error: 'Erro ao salvar modelo de mensagem.' });
    }
  }

  // Dispara uma mensagem de teste
  async sendTestMessage(req: Request, res: Response): Promise<void> {
    try {
      const { phone, text } = req.body;
      if (!phone || !text) {
        res.status(400).json({ error: 'Telefone e mensagem são obrigatórios.' });
        return;
      }
      const result = await whatsAppService.sendTextMessage(phone, text);
      if (result.success) {
        res.json({ message: 'Mensagem de teste enviada com sucesso!' });
      } else {
        res.status(400).json({ error: result.error || 'Falha ao enviar mensagem de teste.' });
      }
    } catch (error: any) {
      res.status(500).json({ error: 'Erro ao enviar mensagem de teste.' });
    }
  }
}
