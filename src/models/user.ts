import { z } from 'zod';
import bcrypt from 'bcryptjs';

export const UserSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email(),
  passwordHash: z.string(),
  username: z.string().min(3).max(50),
  role: z.enum(['admin', 'developer', 'viewer']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

export const UserCreateSchema = z.object({
  tenantId: z.string().uuid(),
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'developer', 'viewer']).default('developer'),
});

export type UserCreate = z.infer<typeof UserCreateSchema>;
export type CreateUserData = UserCreate;

export const UserUpdateSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(['admin', 'developer', 'viewer']).optional(),
});

export type UserUpdate = z.infer<typeof UserUpdateSchema>;
export type UpdateUserData = UserUpdate;

export const UserLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type UserLogin = z.infer<typeof UserLoginSchema>;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
