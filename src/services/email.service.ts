import nodemailer from 'nodemailer';

const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
const smtpUser = process.env.SMTP_USER || '';
const smtpPass = (process.env.SMTP_PASS || '').replace(/"/g, '');
const smtpFrom = process.env.SMTP_FROM || `"AvivaApp" <${smtpUser}>`;

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
  tls: {
    rejectUnauthorized: false
  }
});

/**
 * Envia um e-mail de boas-vindas com a senha temporária para o novo membro.
 * @param to E-mail de destino do membro
 * @param userName Nome completo do membro
 * @param tempPassword Senha temporária em texto puro
 */
export async function sendTemporaryPasswordEmail(
  to: string,
  userName: string,
  tempPassword: string
): Promise<boolean> {
  if (!smtpUser || !smtpPass) {
    console.warn('[EmailService ⚠️] Credenciais de SMTP não configuradas. O envio de e-mail foi pulado.');
    return false;
  }

  const firstName = userName.trim().split(' ')[0] || userName;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bem-vindo(a) ao AvivaApp</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #090d16;
          color: #f1f5f9;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }
        .wrapper {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          padding: 32px 16px;
        }
        .card {
          background-color: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
        }
        .header {
          background: linear-gradient(135deg, #06b6d4 0%, #2563eb 100%);
          padding: 32px 24px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          font-size: 24px;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.5px;
        }
        .header p {
          color: #e0f2fe;
          font-size: 14px;
          margin: 8px 0 0 0;
          opacity: 0.9;
        }
        .body-content {
          padding: 32px 24px;
        }
        .greeting {
          font-size: 18px;
          font-weight: 700;
          color: #f8fafc;
          margin-bottom: 16px;
        }
        .text {
          font-size: 14px;
          line-height: 1.6;
          color: #94a3b8;
          margin-bottom: 24px;
        }
        .pass-container {
          background-color: #020617;
          border: 1px dashed #06b6d4;
          border-radius: 16px;
          padding: 20px;
          text-align: center;
          margin-bottom: 28px;
        }
        .pass-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #38bdf8;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .pass-code {
          font-family: 'Courier New', Courier, monospace;
          font-size: 28px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: 4px;
        }
        .instructions {
          background-color: rgba(30, 41, 59, 0.5);
          border-left: 3px solid #06b6d4;
          border-radius: 8px;
          padding: 12px 16px;
          font-size: 13px;
          color: #cbd5e1;
          margin-bottom: 24px;
        }
        .footer {
          border-top: 1px solid #1e293b;
          padding: 20px 24px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="card">
          <div class="header">
            <h1>✨ Bem-vindo(a) à Família!</h1>
            <p>Seu cadastro como membro foi concluído com sucesso</p>
          </div>
          <div class="body-content">
            <div class="greeting">Olá, ${firstName}!</div>
            <p class="text">
              É uma alegria ter você oficialmente conosco! Sua conta de acesso ao aplicativo foi criada e você já pode acessar o painel para acompanhar grupos, ministérios e avisos da igreja.
            </p>
            
            <div class="pass-container">
              <div class="pass-label">Sua Senha Temporária de Acesso</div>
              <div class="pass-code">${tempPassword}</div>
            </div>

            <div class="instructions">
              🔑 <strong>Primeiro Acesso:</strong> Faça login com seu e-mail (<code>${to}</code>) e a senha temporária acima. Por motivos de segurança, altere sua senha no menu <strong>Meu Perfil</strong> após o primeiro acesso.
            </div>
          </div>
          <div class="footer">
            AvivaApp &copy; 2026 — Gestão Integrada para a sua Igreja
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    console.log(`[EmailService 📧] Enviando e-mail de senha temporária para: ${to}...`);
    const info = await transporter.sendMail({
      from: smtpFrom,
      to,
      subject: `✨ Bem-vindo(a) ao AvivaApp! Sua senha temporária de acesso`,
      text: `Olá ${firstName}!\n\nSeja bem-vindo(a) como membro!\n\nSeu e-mail de acesso: ${to}\nSua senha temporária: ${tempPassword}\n\nAcesse o aplicativo e altere sua senha no seu perfil.`,
      html: htmlContent,
    });

    console.log(`[EmailService ✅] E-mail enviado com sucesso! Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[EmailService ❌] Erro ao enviar e-mail para ${to}:`, error);
    return false;
  }
}
