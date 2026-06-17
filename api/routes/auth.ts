import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db, getNextId, getUserById } from '../db/init.js';
import { authMiddleware, generateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const registerSchema = z.object({
  username: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional()
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    await db.read();
    const user = db.data.users.find(u => u.email === email);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: '邮箱或密码错误'
      });
    }

    const userWithPassword = user as any;
    const isValid = bcrypt.compareSync(password, userWithPassword.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: '邮箱或密码错误'
      });
    }

    const token = generateToken(user.id);
    const { password_hash, ...userWithoutPassword } = userWithPassword;

    res.json({
      success: true,
      data: {
        token,
        user: userWithoutPassword
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: '输入数据格式错误',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: '登录失败'
    });
  }
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, phone } = registerSchema.parse(req.body);

    await db.read();

    const existingUser = db.data.users.find(u => u.email === email || u.username === username);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: '邮箱或用户名已存在'
      });
    }

    const hash = bcrypt.hashSync(password, 10);
    const newUser: any = {
      id: getNextId('users'),
      username,
      email,
      password_hash: hash,
      role: 'gardener',
      phone: phone || '',
      address: '',
      avatar: '',
      createdAt: new Date().toISOString()
    };

    db.data.users.push(newUser);
    await db.write();

    const token = generateToken(newUser.id);
    const { password_hash, ...userWithoutPassword } = newUser;

    res.json({
      success: true,
      data: {
        token,
        user: userWithoutPassword
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: '输入数据格式错误',
        details: error.errors
      });
    }
    res.status(500).json({
      success: false,
      error: '注册失败'
    });
  }
});

router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: req.user
  });
});

export default router;
