import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  signUpSchema,
  signInSchema,
  hashPassword,
  verifyPassword,
  createSession,
  generateToken,
  generateRefreshToken,
} from '@studysync/auth';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Validation schemas for additional endpoints
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().optional(),
  university: z.string().optional(),
  major: z.string().optional(),
  yearOfStudy: z.number().min(1).max(10).optional(),
  avatarUrl: z.string().url().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = signUpSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (existingUser) {
        res.status(409).json({ error: 'User with this email already exists' });
        return;
      }

      // Hash password
      const passwordHash = await hashPassword(validatedData.password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: validatedData.email,
          passwordHash,
          name: validatedData.name,
          university: validatedData.university,
          major: validatedData.major,
          yearOfStudy: validatedData.yearOfStudy,
        },
        select: {
          id: true,
          email: true,
          name: true,
          subscriptionTier: true,
          createdAt: true,
        },
      });

      // Create session
      const session = createSession({
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        subscriptionTier: user.subscriptionTier,
      });

      // Store session in database
      await prisma.session.create({
        data: {
          userId: user.id,
          sessionToken: session.refreshToken,
          expires: session.expiresAt,
        },
      });

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          subscriptionTier: user.subscriptionTier,
        },
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = signInSchema.parse(req.body);

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      // Verify password
      const isValidPassword = await verifyPassword(validatedData.password, user.passwordHash);

      if (!isValidPassword) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      // Create session
      const session = createSession({
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        subscriptionTier: user.subscriptionTier,
      });

      // Store session in database
      await prisma.session.create({
        data: {
          userId: user.id,
          sessionToken: session.refreshToken,
          expires: session.expiresAt,
        },
      });

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          subscriptionTier: user.subscriptionTier,
          university: user.university,
          major: user.major,
          yearOfStudy: user.yearOfStudy,
          avatarUrl: user.avatarUrl,
        },
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token is required' });
        return;
      }

      // Verify refresh token
      const secret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
      let decoded: { userId: string };

      try {
        decoded = jwt.verify(refreshToken, secret) as { userId: string };
      } catch {
        res.status(401).json({ error: 'Invalid or expired refresh token' });
        return;
      }

      // Check if session exists in database
      const session = await prisma.session.findFirst({
        where: {
          sessionToken: refreshToken,
          userId: decoded.userId,
          expires: { gt: new Date() },
        },
        include: { user: true },
      });

      if (!session) {
        res.status(401).json({ error: 'Session not found or expired' });
        return;
      }

      // Generate new tokens
      const newAccessToken = generateToken({
        userId: session.user.id,
        email: session.user.email,
        subscriptionTier: session.user.subscriptionTier,
      });

      const newRefreshToken = generateRefreshToken(session.user.id);

      // Update session with new refresh token
      await prisma.session.update({
        where: { id: session.id },
        data: {
          sessionToken: newRefreshToken,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });

      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        // Delete the specific session
        await prisma.session.deleteMany({
          where: { sessionToken: refreshToken },
        });
      } else if (req.user) {
        // Delete all sessions for the user
        await prisma.session.deleteMany({
          where: { userId: req.user.userId },
        });
      }

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          university: true,
          major: true,
          yearOfStudy: true,
          subscriptionTier: true,
          subscriptionEnd: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({ user });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const validatedData = updateProfileSchema.parse(req.body);

      const user = await prisma.user.update({
        where: { id: req.user.userId },
        data: validatedData,
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          university: true,
          major: true,
          yearOfStudy: true,
          subscriptionTier: true,
          updatedAt: true,
        },
      });

      res.json({
        message: 'Profile updated successfully',
        user,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const validatedData = changePasswordSchema.parse(req.body);

      // Get current user with password
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Verify current password
      const isValidPassword = await verifyPassword(
        validatedData.currentPassword,
        user.passwordHash
      );

      if (!isValidPassword) {
        res.status(401).json({ error: 'Current password is incorrect' });
        return;
      }

      // Hash new password
      const newPasswordHash = await hashPassword(validatedData.newPassword);

      // Update password
      await prisma.user.update({
        where: { id: req.user.userId },
        data: { passwordHash: newPasswordHash },
      });

      // Invalidate all sessions except current
      await prisma.session.deleteMany({
        where: { userId: req.user.userId },
      });

      res.json({ message: 'Password changed successfully. Please login again.' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = forgotPasswordSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      // Always return success to prevent email enumeration
      if (!user) {
        res.json({
          message: 'If an account with that email exists, a password reset link has been sent.',
        });
        return;
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store token in session (using sessionToken field)
      await prisma.session.create({
        data: {
          userId: user.id,
          sessionToken: `reset_${resetToken}`,
          expires: resetTokenExpiry,
        },
      });

      // TODO: Send email with reset link
      // In production, integrate with email service (SendGrid, etc.)
      console.log(`Password reset token for ${user.email}: ${resetToken}`);

      res.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
        // In development, return token for testing
        ...(process.env.NODE_ENV === 'development' && { resetToken }),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);

      // Find valid reset token
      const session = await prisma.session.findFirst({
        where: {
          sessionToken: `reset_${validatedData.token}`,
          expires: { gt: new Date() },
        },
        include: { user: true },
      });

      if (!session) {
        res.status(400).json({ error: 'Invalid or expired reset token' });
        return;
      }

      // Hash new password
      const passwordHash = await hashPassword(validatedData.newPassword);

      // Update password
      await prisma.user.update({
        where: { id: session.userId },
        data: { passwordHash },
      });

      // Delete reset token
      await prisma.session.delete({
        where: { id: session.id },
      });

      // Invalidate all other sessions
      await prisma.session.deleteMany({
        where: { userId: session.userId },
      });

      res.json({ message: 'Password reset successfully. Please login with your new password.' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }
      next(error);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;

      // Find valid verification token
      const session = await prisma.session.findFirst({
        where: {
          sessionToken: `verify_${token}`,
          expires: { gt: new Date() },
        },
      });

      if (!session) {
        res.status(400).json({ error: 'Invalid or expired verification token' });
        return;
      }

      // Mark email as verified
      await prisma.user.update({
        where: { id: session.userId },
        data: { emailVerified: true },
      });

      // Delete verification token
      await prisma.session.delete({
        where: { id: session.id },
      });

      res.json({ message: 'Email verified successfully' });
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { password } = req.body;

      if (!password) {
        res.status(400).json({ error: 'Password is required to delete account' });
        return;
      }

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, user.passwordHash);

      if (!isValidPassword) {
        res.status(401).json({ error: 'Password is incorrect' });
        return;
      }

      // Delete user (cascades to all related data)
      await prisma.user.delete({
        where: { id: req.user.userId },
      });

      res.json({ message: 'Account deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}
