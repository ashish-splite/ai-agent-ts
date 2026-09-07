export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export interface EmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  sentAt: string;
}
