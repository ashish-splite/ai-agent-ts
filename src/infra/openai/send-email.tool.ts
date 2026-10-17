import type { Mailer } from "../../modules/mail/mailer.ts";
import type { AgentTool } from "./tools.ts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SUBJECT_LENGTH = 200;
const MAX_BODY_LENGTH = 50_000;

/**
 * Model-supplied arguments are untrusted, so everything is validated here and
 * recipients are checked against an optional allowlist before sending.
 */
export function createSendEmailTool(
  mailer: Mailer,
  allowedRecipients: string[] = [],
): AgentTool {
  return {
    definition: {
      type: "function",
      function: {
        name: "send_email",
        description:
          "Send an email on behalf of the user. Only call this after the user " +
          "has explicitly confirmed the recipient, subject and body.",
        parameters: {
          type: "object",
          properties: {
            to: {
              type: "string",
              description: "Recipient email address, e.g. example@gmail.com",
            },
            subject: {
              type: "string",
              description: "Short subject line, no line breaks.",
            },
            body: {
              type: "string",
              description: "Plain-text body of the email.",
            },
          },
          required: ["to", "subject", "body"],
          additionalProperties: false,
        },
      },
    },

    handler: async (args) => {
      const to = typeof args.to === "string" ? args.to.trim().toLowerCase() : "";
      const subject =
        typeof args.subject === "string" ? args.subject.trim() : "";
      const body = typeof args.body === "string" ? args.body.trim() : "";

      if (!EMAIL_PATTERN.test(to)) {
        return "Error: 'to' must be a valid email address.";
      }
      if (!subject || !body) {
        return "Error: 'subject' and 'body' must both be non-empty.";
      }
      if (subject.length > MAX_SUBJECT_LENGTH) {
        return `Error: 'subject' must be at most ${MAX_SUBJECT_LENGTH} characters.`;
      }
      if (body.length > MAX_BODY_LENGTH) {
        return `Error: 'body' must be at most ${MAX_BODY_LENGTH} characters.`;
      }
      // CRLF in a header would allow injecting extra headers.
      if (/[\r\n]/.test(subject)) {
        return "Error: 'subject' must not contain line breaks.";
      }
      if (allowedRecipients.length > 0 && !allowedRecipients.includes(to)) {
        return `Error: sending to ${to} is not permitted. Allowed recipients: ${allowedRecipients.join(", ")}.`;
      }

      try {
        const result = await mailer.send({ to, subject, body });
        return `Email sent to ${to} (messageId: ${result.messageId}).`;
      } catch (error) {
        console.error("[agent] send_email failed", error);
        return "Error: the email could not be sent.";
      }
    },
  };
}
