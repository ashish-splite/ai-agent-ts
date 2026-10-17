import OpenAI from "openai";
import type { AppConfig } from "../../config/app-config.ts";

export class OpenAiConnection {
  readonly client: OpenAI;

  constructor(config: AppConfig["openai"]) {
    this.client = new OpenAI({ apiKey: config.apiKey });
  }
}