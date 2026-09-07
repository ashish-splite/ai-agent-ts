import { OpenAiAgent } from "./agent/openai-agent.ts";
import { createAgentToolRegistry } from "./agent/tool-registry.ts";
import type { AgentToolRegistry } from "./agent/tools.ts";
import { AppConfig } from "./config/app-config.ts";
import { ChatController } from "./controllers/chat.controller.ts";
import { UserController } from "./controllers/user.controller.ts";
import { RedisConnection } from "./db/redis-connection.ts";
import { NodemailerMailer } from "./mail/nodemailer-mailer.ts";
import type { AppointmentRepository } from "./ports/appointment-repository.ts";
import type { ChatRepository } from "./ports/chat-repository.ts";
import type { LlmClient } from "./ports/llm-client.ts";
import type { Mailer } from "./ports/mailer.ts";
import type { UserRepository } from "./ports/user-repository.ts";
import { RedisAppointmentRepository } from "./repo/redis-appointment.repository.ts";
import { RedisChatRepository } from "./repo/redis-chat.repository.ts";
import { RedisUserRepository } from "./repo/redis-user.repository.ts";
import { ChatService } from "./services/chat.service.ts";
import { UserService } from "./services/user.service.ts";

/**
 * Composition root. All wiring happens here so classes stay dependency-free
 * and only receive collaborators through their constructors.
 */
export class Container {
  readonly config: AppConfig;
  readonly redis: RedisConnection;
  readonly userRepository: UserRepository;
  readonly userService: UserService;
  readonly userController: UserController;
  readonly llmClient: LlmClient;
  readonly agentTools: AgentToolRegistry;
  readonly chatRepository: ChatRepository;
  readonly chatService: ChatService;
  readonly chatController: ChatController;
  readonly mailer: Mailer;
  readonly appointmentRepository: AppointmentRepository;

  constructor(config: AppConfig = new AppConfig()) {
    this.config = config;

    this.redis = new RedisConnection(this.config);
    this.userRepository = new RedisUserRepository(this.redis.client);
    this.userService = new UserService(this.userRepository);
    this.userController = new UserController(this.userService);

    this.mailer = new NodemailerMailer(this.config);
    this.appointmentRepository = new RedisAppointmentRepository(
      this.redis.client,
    );

    this.agentTools = createAgentToolRegistry({
      mailer: this.mailer,
      mailAllowedRecipients: this.config.mailAllowedRecipients,
      appointmentRepository: this.appointmentRepository,
    });
    this.llmClient = new OpenAiAgent(this.config, this.agentTools);
    this.chatRepository = new RedisChatRepository(this.redis.client);
    this.chatService = new ChatService(this.chatRepository, this.llmClient);
    this.chatController = new ChatController(this.chatService);
  }

  async start(): Promise<void> {
    await this.redis.connect();
  }

  async stop(): Promise<void> {
    await this.redis.disconnect();
  }
}
