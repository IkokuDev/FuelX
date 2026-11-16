import nodemailer, { type Transporter } from 'nodemailer';
import type { MailMessage, MailProvider } from './types';

export function createSmtpMailProvider(smtpUrl: string, from: string): MailProvider {
  let transporter: Transporter | null = null;
  const getTransporter = (): Transporter => {
    if (!transporter) transporter = nodemailer.createTransport(smtpUrl);
    return transporter;
  };
  return {
    name: 'smtp',
    async send(message: MailMessage): Promise<void> {
      await getTransporter().sendMail({ from, ...message });
    },
  };
}
