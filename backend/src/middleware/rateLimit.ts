// src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';

// 🔹 Global limiter: general protection
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // max requests per IP
  message: {
    status: 429,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip static files and frequent internal endpoints
    return (
      req.path === '/favicon.ico' ||
      req.path.startsWith('/static') 
     // req.path === '/api/auth/me'
    );
  },
});

// 🔹 Login limiter: strict protection for login endpoint
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 login attempts per IP
  message: {
    status: 429,
    message: 'Too many login attempts. Try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🔹 Optional: per-user limiter (authenticated routes)
export const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req: Request) => {
    return (req as any).user?.id || req.ip; // Use user ID if logged in, else IP
  },
  handler: (req: Request, res: Response, next: NextFunction, options) => {
    console.log('Rate limit exceeded for:', req.ip);
    res.status(options.statusCode).json(options.message);
  },
  message: {
    status: 429,
    message: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
