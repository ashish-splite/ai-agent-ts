import type { UpdateUserInput, User } from "./user.ts";

export interface UserRepository {
  create(user: User): Promise<User>;
  findAll(): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  update(id: string, patch: UpdateUserInput): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}
