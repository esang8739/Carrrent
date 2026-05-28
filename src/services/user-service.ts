import { User, CreateUserData, UpdateUserData } from '../models/user.js';
import { UserRepository } from '../repositories/user-repository.js';
import { logger } from '../utils/logger.js';

const serviceLogger = logger.child('userService');

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error(`User not found: ${id}`);
    }
    return user;
  }

  async getUserByUsername(username: string): Promise<User> {
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new Error(`User not found: ${username}`);
    }
    return user;
  }

  async getAllUsers(options?: { limit?: number; offset?: number }): Promise<User[]> {
    return this.userRepository.findAll(options);
  }

  async createUser(data: CreateUserData): Promise<User> {
    serviceLogger.info('Creating user', { username: data.username });

    const existsByUsername = await this.userRepository.existsByUsername(data.username);
    if (existsByUsername) {
      throw new Error(`Username already exists: ${data.username}`);
    }

    const existsByEmail = await this.userRepository.existsByEmail(data.email);
    if (existsByEmail) {
      throw new Error(`Email already exists: ${data.email}`);
    }

    return this.userRepository.create(data);
  }

  async updateUser(id: string, data: UpdateUserData): Promise<User> {
    serviceLogger.info('Updating user', { id });

    const user = await this.userRepository.update(id, data);
    if (!user) {
      throw new Error(`User not found: ${id}`);
    }

    return user;
  }

  async deleteUser(id: string): Promise<void> {
    serviceLogger.info('Deleting user', { id });
    const deleted = await this.userRepository.delete(id);
    if (!deleted) {
      throw new Error(`Failed to delete user: ${id}`);
    }
  }
}
