import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters long')
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required')
});

export const googleLoginSchema = z.object({
  idToken: z.string().min(1, 'Google ID Token is required')
});
