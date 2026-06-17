import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, getUserById } from '../db/init.js';

const JWT_SECRET = process.env.JWT_SECRET || 'garden-secret-key-2026';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: '未提供认证令牌'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    await db.read();
    const user = getUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: '用户不存在'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: '认证令牌无效'
    });
  }
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: '需要管理员权限'
    });
  }
  next();
}

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}
