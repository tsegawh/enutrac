import express from 'express';
import bcrypt from 'bcryptjs';
//import jwt from 'jsonwebtoken';
import jwt, { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import nodemailer from 'nodemailer';
import { loginLimiter } from '../middleware/rateLimit';
import passport from "../services/googleAuth";

const router = express.Router();
const prisma = new PrismaClient();


// 🔒 SECURITY NOTE: always ensure JWT_SECRET is defined at startup
if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET not set");
  process.exit(1);
}

// Email transporter setup
/**const emailTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: 'bluetsegaw,
    pass: 'pas',
  },
});
**/
// Email transporter setup
const emailTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  authMethod: "LOGIN",

  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 10000,
  tls: {
    rejectUnauthorized: false
  }
});

// Register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      throw createError('Email, password, and name are required', 400);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw createError('User already exists with this email', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      }
    });

    // Create free subscription for new user
    const freePlan = await prisma.subscriptionPlan.findFirst({
      where: { name: 'Free' }
    });

    if (freePlan) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + freePlan.durationDays);

      await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: freePlan.id,
          endDate,
        }
      });
    }
 
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );
const refreshtoken = jwt.sign(
      { userId: user.id },
      process.env.REFRESH_TOKEN_SECRET!,
      { expiresIn: '30d' }
    );
    // ✅ Fix: send as httpOnly cookie
     const isProduction = process.env.NODE_ENV === 'production';

// access token cookie
res.cookie('token', token, {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'strict' : 'lax',
  maxAge: 15 * 60 * 1000, // 15 min
});

// refresh token cookie
res.cookie('refreshToken', refreshtoken, {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'strict' : 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
});
 res.status(201).json({
     message: 'User registered successfully', 
     user }); 
  
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password ,rememberMe} = req.body;

    if (!email || !password) {
       return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        subscription: {
          include: {
            plan: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );
    const refreshtoken = jwt.sign(
      { userId: user.id },
      process.env.REFRESH_TOKEN_SECRET!,
      { expiresIn: '30d' }
    );
// ✅ Fix: send as httpOnly cookie
    const isProduction = process.env.NODE_ENV === 'production';

// access token cookie
res.cookie('token', token, {
  httpOnly: true,
  secure: isProduction ? true : false, // must be false in dev (localhost)
  sameSite: isProduction ? 'strict' : 'lax', // lax works in localhost
  maxAge: 15 * 60 * 1000, // 15 min
  path: '/',
});

// refresh token cookie
res.cookie('refreshToken', refreshtoken, {
  httpOnly: true,
  secure: isProduction ? true : false, // must be false in dev (localhost)
  sameSite: isProduction ? 'strict' : 'lax', // lax works in localhost
  maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : undefined, // undefined = session cookie
  path: '/',
});

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
     
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
     const user = await prisma.user.findUnique({
  where: { id: authReq.user!.id },
  select: {
    id: true,
    email: true,
    name: true,
    role: true,
    createdAt: true,
    subscription: {
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        plan: {
          select: {
            id: true,
            name: true,
            deviceLimit: true
          }
        }
      }
    }
  }
});

    if (!user) {
      throw createError('User not found', 404);
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});
router.post('/refresh', async (req, res, next) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });

  try {
    const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as JwtPayload & { userId: string };

    const newAccessToken = jwt.sign(
      { userId: payload.userId },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', newAccessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });

    res.json({ success: true });
  } catch {
    res.status(403).json({ message: 'Invalid refresh token' });
  }
});

// Logout route - add same options as setting cookies
router.post('/logout', authenticateToken, (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
  });
  
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite:isProduction ? 'strict' : 'lax',
    path: '/',
  });
  
  res.json({ message: 'Logout successful' });
});

// Forgot password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw createError('Email is required', 400);
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ 
        success: true, 
        message: 'If an account with that email exists, we have sent a password reset link.' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Save reset token to user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry
      }
    });

    // Send reset email
    const FRONTEND = process.env.FRONTEND_URL;

        
    const resetUrl = `${FRONTEND}/reset-password?token=${resetToken}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        
        <p>Hello ${user.name},</p>
        
        <p>You requested a password reset for your Enutrac account. Click the button below to reset your password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        
        <p>This link will expire in 1 hour for security reasons.</p>
        
        <p>If you didn't request this password reset, please ignore this email.</p>
        
        <p>Best regards,<br>Enutrac Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `;

    try {
      await emailTransporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@traccar.com',
        to: user.email,
        subject: 'Password Reset Request - Enutrac',
        html: emailHtml,
      });
    } catch (emailError) {
      console.error('Error sending reset email:', emailError);
      // Don't throw error to prevent revealing if email exists
    }

    res.json({ 
      success: true, 
      message: 'If an account with that email exists, we have sent a password reset link.' 
    });

  } catch (error) {
    next(error);
  }
});

// Reset password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      throw createError('Token and password are required', 400);
    }

    if (password.length < 6) {
      throw createError('Password must be at least 6 characters long', 400);
    }

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      throw createError('Invalid or expired reset token', 400);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    res.json({ 
      success: true, 
      message: 'Password reset successfully' 
    });

  } catch (error) {
    next(error);
  }
});



// --- Google OAuth2 routes ---
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req: any, res) => {
    const { token, user } = req.user;
    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/oauth-success?token=${token}`);
  }
);


export default router;