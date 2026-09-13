export class AppConfig {
  readonly port: number;
  readonly redisUrl: string;
  readonly openaiApiKey: string;
  readonly llmModel: string;
  readonly maxTokens: number;
  readonly gmailUser: string;
  readonly gmailAppPassword: string;
  readonly mailFrom: string;
  /** Empty means the agent may email any address. */
  readonly mailAllowedRecipients: string[];

  constructor(env: Record<string, string | undefined> = process.env) {
    this.port = Number(env.PORT ?? 3000);
    this.redisUrl = env.REDIS_URL ?? "redis://localhost:6379";
    this.openaiApiKey = env.OPENAI_API_KEY ?? "test-gemini-key";
    this.llmModel = env.LLM_MODEL ?? "gpt-4o-mini";
    this.maxTokens = Number(env.MAX_TOKENS ?? 4096);
    this.gmailUser = env.GMAIL_USER ?? "";
    this.gmailAppPassword = env.GMAIL_APP_PASSWORD ?? "";
    this.mailFrom = env.MAIL_FROM ?? this.gmailUser;
    this.mailAllowedRecipients = (env.MAIL_ALLOWED_RECIPIENTS ?? "")
      .split(",")
      .map((address) => address.trim().toLowerCase())
      .filter((address) => address.length > 0);

    if (!this.openaiApiKey) {
      throw new Error("OPENAI_API_KEY is required");
    }
  }
}
