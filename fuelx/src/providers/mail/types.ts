export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface MailProvider {
  name: string;
  send(message: MailMessage): Promise<void>;
}
