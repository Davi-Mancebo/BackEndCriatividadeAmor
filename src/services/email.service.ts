import 'dotenv/config';
import nodemailer from 'nodemailer';
import { Order } from '@prisma/client';

const PASSWORD_RESET_CODE_MINUTES = Number(process.env.PASSWORD_RESET_EXPIRATION_MINUTES || 15);

interface SendMailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

class EmailService {
  private transporter?: nodemailer.Transporter;
  private enabled: boolean;

  constructor() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const port = Number(process.env.SMTP_PORT || 465);
    const secureEnv = process.env.SMTP_SECURE;
    const secure = secureEnv ? secureEnv === 'true' : port === 465;

    if (!host || !user || !pass) {
      this.enabled = false;
      console.warn('[EmailService] SMTP não configurado. Envio de emails desativado.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    this.enabled = true;
  }

  private getFromAddress() {
    return process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@criatividadeeamor.com';
  }

  private stripHtml(html: string) {
    return html.replace(/<[^>]*>/g, '').replace(/\s{2,}/g, ' ').trim();
  }

  private formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  private normalizeItems(items: any): Array<{ title?: string; name?: string; quantity?: number; price?: number }> {
    if (!items) {
      return [];
    }

    if (Array.isArray(items)) {
      return items;
    }

    if (typeof items === 'string') {
      try {
        const parsed = JSON.parse(items);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (error) {
        console.warn('[EmailService] Não foi possível converter items do pedido para array.');
      }
    }

    return [];
  }

  async sendMail(options: SendMailOptions) {
    if (!this.enabled || !this.transporter) {
      console.warn('[EmailService] Tentativa de envio ignorada (serviço desativado).');
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.getFromAddress(),
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || (options.html ? this.stripHtml(options.html) : undefined),
      });
    } catch (error) {
      console.error('[EmailService] Falha ao enviar email:', error);
    }
  }

  async sendWelcomeEmail(data: { name: string; email: string }) {
    const firstName = data.name?.split(' ')[0] || 'criativa(o)';
    const subject = 'Bem-vinda(o) à Criatividade e Amor!';
    const html = `
      <p>Olá ${firstName},</p>
      <p>Seu cadastro na <strong>Criatividade e Amor</strong> foi concluído com sucesso. Agora você pode acompanhar pedidos, acessar downloads e receber novidades em primeira mão.</p>
      <p>Use o mesmo email (${data.email}) para fazer login quando quiser.</p>
      <p>Abraços,<br/>Equipe Criatividade e Amor</p>
    `;

    await this.sendMail({
      to: data.email,
      subject,
      html,
    });
  }

  async sendOrderConfirmation(order: Order) {
    if (!order.customerEmail) {
      return;
    }

    const items = this.normalizeItems(order.items);
    const itemList = items
      .map((item) => {
        const quantity = item.quantity || 1;
        const title = item.title || item.name || 'Produto';
        const price = item.price || 0;
        return `<li>${quantity}x ${title} — ${this.formatCurrency(price * quantity)}</li>`;
      })
      .join('');

    const subject = `Recebemos seu pedido #${order.orderNumber}`;
    const html = `
      <p>Olá ${order.customerName},</p>
      <p>Recebemos o seu pedido <strong>#${order.orderNumber}</strong> e já estamos cuidando de tudo.</p>
      ${itemList ? `<ul>${itemList}</ul>` : ''}
      <p>Total: <strong>${this.formatCurrency(order.total)}</strong></p>
      <p>Assim que o pagamento for confirmado, enviaremos outro email liberando seus downloads.</p>
      <p>Para acompanhar, basta acessar o painel da loja com seu email ${order.customerEmail}.</p>
      <p>Obrigada por apoiar o trabalho criativo! 💖</p>
    `;

    await this.sendMail({
      to: order.customerEmail,
      subject,
      html,
    });
  }

  async sendPaymentConfirmation(order: Order) {
    if (!order.customerEmail) {
      return;
    }

    const items = this.normalizeItems(order.items);
    const subject = `Pagamento confirmado – Pedido #${order.orderNumber}`;
    const html = `
      <p>Olá ${order.customerName},</p>
      <p>Recebemos o pagamento do pedido <strong>#${order.orderNumber}</strong>. Seus produtos digitais já estão liberados para download.</p>
      <p>Acesse a área "Meus Downloads" no site e faça o login com ${order.customerEmail}.</p>
      <p>Total pago: <strong>${this.formatCurrency(order.total)}</strong></p>
      ${items.length ? '<p>Resumo do pedido:</p><ul>' + items.map((item) => `<li>${item.quantity || 1}x ${item.title || item.name || 'Produto'}</li>`).join('') + '</ul>' : ''}
      <p>Qualquer dúvida é só responder este email.</p>
      <p>Bom proveito! ✨</p>
    `;

    await this.sendMail({
      to: order.customerEmail,
      subject,
      html,
    });
  }

  async sendPasswordResetCode(data: { email: string; code: string; name?: string; expiresAt: Date }) {
    const firstName = data.name?.split(' ')[0] || 'cliente';
    const subject = 'Código para redefinir sua senha';

    const html = `
      <p>Olá ${firstName},</p>
      <p>Recebemos um pedido para redefinir sua senha. Use o código abaixo no site para continuar:</p>
      <p style="font-size: 20px; font-weight: bold; letter-spacing: 4px;">${data.code}</p>
      <p>Este código expira em ${PASSWORD_RESET_CODE_MINUTES} minutos (até ${data.expiresAt.toLocaleTimeString('pt-BR')}). Se você não solicitou, pode ignorar este email.</p>
      <p>Equipe Criatividade e Amor</p>
    `;

    await this.sendMail({
      to: data.email,
      subject,
      html,
    });
  }
}

export default new EmailService();
