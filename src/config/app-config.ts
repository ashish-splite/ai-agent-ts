export class AppConfig {
  readonly port: number;
  readonly redisUrl: string;

  constructor(env: Record<string, string | undefined> = process.env) {
    this.port = Number(env.PORT ?? 3000);
    this.redisUrl = env.REDIS_URL ?? "redis://localhost:6379";
  }
}
