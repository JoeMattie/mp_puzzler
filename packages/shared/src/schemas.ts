// packages/shared/src/schemas.ts
import { z } from 'zod';

export const createGameSchema = z.object({
  imageId: z.string().uuid(),
  pieceCount: z.number().int().min(200).max(900),
  tileType: z.union([
    z.literal('classic'),
    z.string().regex(/^pentagon_(0[1-9]|1[0-5])$/)
  ])
});

export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type CreateGameInput = z.infer<typeof createGameSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
