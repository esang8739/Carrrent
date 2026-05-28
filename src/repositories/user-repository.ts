import { User, CreateUserData, UpdateUserData } from '../models/user.js';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(options?: FindAllUsersOptions): Promise<User[]>;
  create(data: CreateUserData): Promise<User>;
  update(id: string, data: UpdateUserData): Promise<User | null>;
  delete(id: string): Promise<boolean>;
  existsByUsername(username: string): Promise<boolean>;
  existsByEmail(email: string): Promise<boolean>;
}

export interface FindAllUsersOptions {
  limit?: number;
  offset?: number;
  role?: User['role'];
  sortBy?: keyof User;
  sortOrder: 'asc' | 'desc';
}
