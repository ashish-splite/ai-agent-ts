import type { AppConfig } from "../../config/app-config.ts";
import { NodemailerMailer } from "../../infra/mail/nodemailer-mailer.ts";
import { createBookAppointmentTool } from "../../infra/openai/book-appointment.tool.ts";
import { OpenAiAgent } from "../../infra/openai/openai-agent.ts";
import { createSendEmailTool } from "../../infra/openai/send-email.tool.ts";
import { AgentToolRegistry } from "../../infra/openai/tools.ts";
import { RedisAppointmentRepository } from "../../infra/redis/redis-appointment.repository.ts";
import { RedisChatRepository } from "../../infra/redis/redis-chat.repository.ts";
import { RedisConnection } from "../../infra/redis/redis-connection.ts";
import { RedisUserRepository } from "../../infra/redis/redis-user.repository.ts";
import { ChatService } from "../../modules/chat/chat.service.ts";
import { HealthService } from "../../modules/health/health.service.ts";
import { UserService } from "../../modules/users/user.service.ts";
import { ChatController } from "./elysia/controllers/chat.controller.ts";
import { HealthController } from "./elysia/controllers/health.controller.ts";
import { UserController } from "./elysia/controllers/user.controller.ts";

export class HttpContainer {
  readonly redis: RedisConnection;
  readonly mailer: NodemailerMailer;

  readonly userRepository: RedisUserRepository;
  readonly chatRepository: RedisChatRepository;
  readonly appointmentRepository: RedisAppointmentRepository;

  readonly agentTools: AgentToolRegistry;
  readonly llmClient: OpenAiAgent;

  readonly userService: UserService;
  readonly chatService: ChatService;
  readonly healthService: HealthService;

  readonly userController: UserController;
  readonly chatController: ChatController;
  readonly healthController: HealthController;

  constructor(config: AppConfig) {
    this.redis = new RedisConnection(config.redis);
    this.mailer = new NodemailerMailer(config.mail);

    this.userRepository = new RedisUserRepository(this.redis.client);
    this.chatRepository = new RedisChatRepository(this.redis.client);
    this.appointmentRepository = new RedisAppointmentRepository(this.redis.client);

    this.agentTools = new AgentToolRegistry([
      createSendEmailTool(this.mailer, config.mail.allowedRecipients),
      createBookAppointmentTool(this.appointmentRepository),
    ]);
    this.llmClient = new OpenAiAgent(config.openai, this.agentTools);

    this.userService = new UserService(this.userRepository);
    this.chatService = new ChatService(this.chatRepository, this.llmClient);
    this.healthService = new HealthService([this.redis]);

    this.userController = new UserController(this.userService);
    this.chatController = new ChatController(this.chatService);
    this.healthController = new HealthController(this.healthService);
  }
}
