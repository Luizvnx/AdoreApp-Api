import fs from 'fs';
import path from 'path';

export class WhatsAppService {
  private get apiUrl(): string {
    return (process.env.EVOLUTION_API_URL || 'https://evolution-api-production-d166.up.railway.app').replace(/\/$/, '');
  }

  private get apiKey(): string {
    return process.env.EVOLUTION_API_KEY || '429683C4C977415CAAFCCE10F7D57E11';
  }

  private get instanceName(): string {
    return process.env.EVOLUTION_INSTANCE_NAME || 'AvivaIgreja';
  }

  private get templateFilePath(): string {
    return path.join(__dirname, '../../templates/welcome_message.txt');
  }

  // Formata o número de telefone para o padrão internacional do WhatsApp (ex: 5579999999999)
  public formatPhoneNumber(phone: string): string {
    if (!phone) return '';
    let digits = phone.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 10 || digits.length === 11) {
      digits = `55${digits}`;
    }
    return digits;
  }

  // Extrai o base64 do QR code de qualquer estrutura de JSON da Evolution API (v1 ou v2)
  private extractBase64(data: any): string | null {
    if (!data) return null;
    if (typeof data === 'string' && data.startsWith('data:image')) return data;
    if (data.base64 && typeof data.base64 === 'string') return data.base64;
    if (data.code && typeof data.code === 'string' && data.code.includes('base64')) return data.code;
    if (data.qrcode?.base64) return data.qrcode.base64;
    if (data.qrcode?.code) return data.qrcode.code;
    if (typeof data.qrcode === 'string' && data.qrcode.includes('base64')) return data.qrcode;
    return null;
  }

  // Lê o modelo de texto de boas-vindas
  public getWelcomeTemplate(): string {
    try {
      if (fs.existsSync(this.templateFilePath)) {
        return fs.readFileSync(this.templateFilePath, 'utf-8');
      }
    } catch (err) {
      console.error('Erro ao ler template de mensagem:', err);
    }
    return `Olá, {{nome}}! Seja muito bem-vindo(a) à {{igreja}}! 🕊️\n\nFicamos felizes com sua visita! Nossos cultos acontecem:\n• Domingo às 18:00h\n• Quarta-feira às 19:30h\n\nSe precisar, fale com quem te recebeu:\n👤 {{acolhedor_nome}}\n📱 {{acolhedor_telefone}}`;
  }

  // Salva o novo modelo de texto de boas-vindas
  public updateWelcomeTemplate(content: string): void {
    const dir = path.dirname(this.templateFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.templateFilePath, content, 'utf-8');
  }

  // Obtém o status da conexão da instância no Evolution API
  public async getConnectionStatus(): Promise<{
    connected: boolean;
    state: string;
    instanceName: string;
    apiUrl: string;
    qrCodeBase64?: string | null;
    pairCode?: string | null;
    message?: string;
  }> {
    try {
      const stateUrl = `${this.apiUrl}/instance/connectionState/${this.instanceName}`;
      const response = await fetch(stateUrl, {
        headers: { apikey: this.apiKey },
        signal: AbortSignal.timeout(4000),
      });

      if (response.ok) {
        const data: any = await response.json();
        const stateData = data?.instance?.state || data?.state || 'close';

        if (stateData === 'open') {
          return {
            connected: true,
            state: 'open',
            instanceName: this.instanceName,
            apiUrl: this.apiUrl,
          };
        }
      }

      // Se não estiver aberta, solicita o QR code para conexão
      const qrRes = await this.connectInstance();
      return {
        connected: false,
        state: 'close',
        instanceName: this.instanceName,
        apiUrl: this.apiUrl,
        qrCodeBase64: qrRes.qrCodeBase64,
        pairCode: qrRes.pairCode,
      };
    } catch (error: any) {
      return {
        connected: false,
        state: 'offline',
        instanceName: this.instanceName,
        apiUrl: this.apiUrl,
        message: `Servidor Evolution API não encontrado em ${this.apiUrl} (${error?.message || 'Conexão recusada'}).`,
      };
    }
  }

  // Solicita o QR Code / Criação de instância no Evolution API
  public async connectInstance(): Promise<{ qrCodeBase64?: string | null; pairCode?: string | null }> {
    try {
      const connectUrl = `${this.apiUrl}/instance/connect/${this.instanceName}`;
      console.log(`[Evolution API] Tentando conectar instância em: ${connectUrl}`);
      
      const res = await fetch(connectUrl, {
        headers: { apikey: this.apiKey },
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data: any = await res.json();
        const base64 = this.extractBase64(data);
        const pairCode = data?.pairingCode || data?.code;

        if (base64) {
          console.log('[Evolution API] QR Code obtido com sucesso!');
          return { qrCodeBase64: base64, pairCode: pairCode || null };
        }
      }
    } catch (error: any) {
      console.warn('[Evolution API Warning] Falha na rota /connect, tentando /create:', error?.message);
    }

    // Se a instância ainda não existir, envia a requisição de criação de instância
    try {
      const createUrl = `${this.apiUrl}/instance/create`;
      console.log(`[Evolution API] Criando nova instância em: ${createUrl}`);

      const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: { apikey: this.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName: this.instanceName,
          token: this.apiKey,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (createRes.ok) {
        const createData: any = await createRes.json();
        const base64 = this.extractBase64(createData);
        if (base64) {
          console.log('[Evolution API] Instância criada e QR Code gerado!');
          return { qrCodeBase64: base64 };
        }
      }
    } catch (err: any) {
      console.warn('[Evolution API Error] Erro ao criar instância:', err?.message);
    }

    return { qrCodeBase64: null };
  }

  // Desconecta / Encerra a sessão do WhatsApp
  public async disconnectInstance(): Promise<boolean> {
    try {
      const logoutUrl = `${this.apiUrl}/instance/logout/${this.instanceName}`;
      const res = await fetch(logoutUrl, {
        method: 'DELETE',
        headers: { apikey: this.apiKey },
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch (error) {
      return false;
    }
  }

  // Envia uma mensagem de texto simples para um número via Evolution API
  public async sendTextMessage(phone: string, text: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const formattedPhone = this.formatPhoneNumber(phone);
    if (!formattedPhone) {
      return { success: false, error: 'Número de telefone inválido.' };
    }

    try {
      const sendUrl = `${this.apiUrl}/message/sendText/${this.instanceName}`;
      const response = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          apikey: this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: formattedPhone,
          text,
          options: {
            delay: 1200,
            presence: 'composing',
          },
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      } else {
        const errData: any = await response.json().catch(() => ({}));
        return { success: false, error: errData?.message || `HTTP ${response.status}` };
      }
    } catch (error: any) {
      console.warn(`[WhatsApp API Warning] Falha ao enviar para ${formattedPhone}:`, error?.message);
      return { success: false, error: error?.message || 'Erro ao enviar mensagem via Evolution API' };
    }
  }

  // Processa a mensagem de boas-vindas com as variáveis e envia para o visitante recém-cadastrado
  public async sendWelcomeMessageToVisitor(visitor: {
    fullName: string;
    phone?: string | null;
    registeredBy?: { fullName?: string | null; memberProfile?: { phone?: string | null } | null } | null;
    congregation?: { name?: string | null } | null;
  }): Promise<boolean> {
    if (!visitor.phone) return false;

    let template = this.getWelcomeTemplate();

    const churchName = visitor.congregation?.name || 'nossa igreja';
    const acolhedorName = visitor.registeredBy?.fullName || 'Equipe de Acolhimento';
    const acolhedorPhone = visitor.registeredBy?.memberProfile?.phone || '(Contato da recepção)';

    const processedText = template
      .replace(/\{\{nome\}\}/g, visitor.fullName)
      .replace(/\{\{igreja\}\}/g, churchName)
      .replace(/\{\{acolhedor_nome\}\}/g, acolhedorName)
      .replace(/\{\{acolhedor_telefone\}\}/g, acolhedorPhone)
      .replace(/\{\{dias_culto\}\}/g, 'Domingo às 18:00h e Quarta-feira às 19:30h');

    const result = await this.sendTextMessage(visitor.phone, processedText);
    return result.success;
  }
}

export const whatsAppService = new WhatsAppService();
