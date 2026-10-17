import { NotFoundError, ValidationError } from "../../shared/errors.ts";
import type {
  CreateUserInput,
  UpdateUserInput,
  User,
} from "./user.ts";
import type { UserRepository } from "./user.repository.ts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class UserService {
  constructor(private readonly repository: UserRepository) {}

  async create(input: CreateUserInput): Promise<User> {
    const name = this.requireName(input.name);
    const email = this.requireEmail(input.email);

    const now = new Date().toISOString();
    const user: User = {
      id: crypto.randomUUID(),
      name,
      email,
      createdAt: now,
      updatedAt: now,
    };

    return this.repository.create(user);
  }

  async list(): Promise<User[]> {
    return this.repository.findAll();
  }

  async get(id: string): Promise<User> {
    const user = await this.repository.findById(id);
    if (!user) throw new NotFoundError(`User ${id} not found`);
    return user;
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    const patch: UpdateUserInput = {};
    if (input.name !== undefined) patch.name = this.requireName(input.name);
    if (input.email !== undefined) patch.email = this.requireEmail(input.email);

    if (Object.keys(patch).length === 0) {
      throw new ValidationError("Provide at least one of: name, email");
    }

    const updated = await this.repository.update(id, patch);
    if (!updated) throw new NotFoundError(`User ${id} not found`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new NotFoundError(`User ${id} not found`);
  }

  private requireName(value: unknown): string {
    if (typeof value !== "string" || value.trim().length < 2) {
      throw new ValidationError("name must be at least 2 characters");
    }
    return value.trim();
  }

  private requireEmail(value: unknown): string {
    if (typeof value !== "string" || !EMAIL_PATTERN.test(value.trim())) {
      throw new ValidationError("email must be a valid email address");
    }
    return value.trim().toLowerCase();
  }
}
