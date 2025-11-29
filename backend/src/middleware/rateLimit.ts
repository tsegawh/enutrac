// src/middleware/rateLimiter.ts
import rateLimit, { ipKeyGenerator as baseIpKeyGenerator } from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
/// Wrapper to satisfy TypeScript
const ipKeyGenerator = (req: Request): string => {
  return baseIpKeyGenerator(req as any); // cast to any to satisfy type
};

// 🔹 Global limiter: general protection
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // max requests per IP
  message: {
    status: 429,
    message: 'Too many requests from this IP, please try again later.',
  },
  keyGenerator: (req: Request) => ipKeyGenerator(req),
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
  keyGenerator: (req: Request) => ipKeyGenerator(req),
  standardHeaders: true,
  legacyHeaders: false,
});

// 🔹 Optional: per-user limiter (authenticated routes)
export const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id;
    return userId ? String(userId) : ipKeyGenerator(req);
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
