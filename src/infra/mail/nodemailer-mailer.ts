import nodemailer, { type Transporter } from "nodemailer";
import type { AppConfig } from "../../config/app-config.ts";
import type { EmailMessage, EmailResult } from "../../modules/mail/email.ts";
import type { Mailer } from "../../modules/mail/mailer.ts";

export class NodemailerMailer implements Mailer {
  private transporter?: Transporter;

  constructor(private readonly config: AppConfig["mail"]) {}

  async send(message: EmailMessage): Promise<EmailResult> {
    const info = await this.transport().sendMail({
      from: this.config.from,
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
    if (!this.config.gmail.user || !this.config.gmail.appPassword) {
      throw new Error(
        "Mail is not configured: set mail.gmail.user and mail.gmail.appPassword in config.yaml",
      );
    }

    this.transporter ??= nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: this.config.gmail.user,
        pass: this.config.gmail.appPassword,
      },
    });

    return this.transporter;
  }
}
