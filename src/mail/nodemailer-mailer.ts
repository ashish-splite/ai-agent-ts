import nodemailer, { type Transporter } from "nodemailer";
import type { AppConfig } from "../config/app-config.ts";
import type { EmailMessage, EmailResult } from "../domain/email.ts";
import type { Mailer } from "../ports/mailer.ts";

export class NodemailerMailer implements Mailer {
  private transporter?: Transporter;

  constructor(private readonly config: AppConfig) {}

  async send(message: EmailMessage): Promise<EmailResult> {
    const info = await this.transport().sendMail({
      from: this.config.mailFrom,
      to: message.to,
      subject: message.subject,
      text: message.body,
      ...(message.html ? { html: message.html } : {}),
    });

    return {
      messageId: info.messageId,
      accepted: (info.accepted ?? []).map(String),
      rejected: (info.rejected ?? []).map(String),
      sentAt: new Date().toISOString(),
    };
  }

  async verify(): Promise<boolean> {
    return this.transport().verify();
  }

  // Built on first use so the app still boots without mail credentials.
  private transport(): Transporter {
    if (!this.config.gmailUser || !this.config.gmailAppPassword) {
      throw new Error(
        "Mail is not configured: set GMAIL_USER and GMAIL_APP_PASSWORD",
      );
    }

    this.transporter ??= nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: this.config.gmailUser,
        pass: this.config.gmailAppPassword,
      },
    });

    return this.transporter;
  }
}
