import { Request, Response, NextFunction, RequestHandler } from 'express';
//import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import jwt, { JwtPayload } from 'jsonwebtoken';
const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  createdAt:Date;
  };
}

export const authenticateToken: RequestHandler = async (
  req,
  res,
  next,
) => {
  
try {
    // Get token from cookie or Authorization header
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access token required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    if (!decoded || typeof decoded !== 'object' || !('userId' in decoded)) {
      return res.status(403).json({ error: 'Invalid token payload' });
    }


    

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true ,createdAt:true}
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
const authReq = req as AuthRequest;
    authReq.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  const authReq = req as AuthRequest;
  if (authReq.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};