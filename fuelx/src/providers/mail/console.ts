import { logger } from '../../lib/logger';
import type { MailMessage, MailProvider } from './types';

/** Default in development and test: write the message to the log, send nothing. */
export const consoleMailProvider: MailProvider = {
  name: 'console',
  async send(message: MailMessage): Promise<void> {
    logger.info({ to: message.to, subject: message.subject }, 'Outbound email (console driver)');
  },
};
