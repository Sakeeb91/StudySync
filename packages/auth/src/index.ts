import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// Validation schemas
export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
  university: z.string().optional(),
  major: z.string().optional(),
  yearOfStudy: z.number().min(1).max(10).optional(),
});

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;

// Password utilities
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// JWT utilities
export interface JWTPayload {
  userId: string;
  email: string;
  subscriptionTier: string;
}

export const generateToken = (payload: JWTPayload): string => {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  return jwt.sign(payload, secret, {
    expiresIn: '7d',
  });
};

export const verifyToken = (token: string): JWTPayload => {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  return jwt.verify(token, secret) as JWTPayload;
};

export const generateRefreshToken = (userId: string): string => {
  const secret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
  return jwt.sign({ userId }, secret, {
    expiresIn: '30d',
  });
};

// Session management
export interface Session {
  user: {
    id: string;
    email: string;
    name?: string;
    subscriptionTier: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export const createSession = (user: {
  id: string;
  email: string;
  name?: string;
  subscriptionTier: string;
}): Session => {
  const accessToken = generateToken({
    userId: user.id,
    email: user.email,
    subscriptionTier: user.subscriptionTier,
  });

  const refreshToken = generateRefreshToken(user.id);

  return {
    user,
    accessToken,
    refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  };
};