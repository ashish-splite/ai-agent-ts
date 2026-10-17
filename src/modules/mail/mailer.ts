import type { EmailMessage, EmailResult } from "./email.ts";

export interface Mailer {
  send(message: EmailMessage): Promise<EmailResult>;
  /** Confirms the SMTP credentials and connection are usable. */
  verify(): Promise<boolean>;
}
