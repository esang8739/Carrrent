export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export type UserRole = 'admin' | 'developer' | 'viewer';

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  lastLoginAt?: Date;
}
