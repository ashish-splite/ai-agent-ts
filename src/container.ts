import { AppConfig } from "./config/app-config.ts";
import { UserController } from "./controllers/user.controller.ts";
import { RedisConnection } from "./db/redis-connection.ts";
import type { UserRepository } from "./ports/user-repository.ts";
import { RedisUserRepository } from "./repo/redis-user.repository.ts";
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

  constructor(config: AppConfig = new AppConfig()) {
    this.config = config;

    this.redis = new RedisConnection(this.config);
    this.userRepository = new RedisUserRepository(this.redis.client);
    this.userService = new UserService(this.userRepository);
    this.userController = new UserController(this.userService);
  }

  async start(): Promise<void> {
    await this.redis.connect();
  }

  async stop(): Promise<void> {
    await this.redis.disconnect();
  }
}
