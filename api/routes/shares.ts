import { Router, Response } from 'express';
import { z } from 'zod';
import { db, getNextId, getUserById, formatSharePost } from '../db/init.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

const shareSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(10),
  category: z.enum(['seeds', 'seedling', 'tool', 'other']),
  quantity: z.number().min(1),
  location: z.string(),
  contact: z.string(),
  photos: z.array(z.string()).default([])
});

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.read();
    const { category, status } = req.query;

    let posts = [...db.data.sharePosts];

    if (category) {
      posts = posts.filter(p => p.category === category);
    }

    if (status) {
      posts = posts.filter(p => p.status === status);
    }

    posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const formattedPosts = posts.map(formatSharePost);

    res.json({
      success: true,
      data: formattedPosts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取分享列表失败'
    });
  }
});

router.get('/my', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.read();
    const userId = req.user!.id;

    const posts = db.data.sharePosts
      .filter(p => p.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(formatSharePost);

    res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取我的分享失败'
    });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = shareSchema.parse(req.body);
    const userId = req.user!.id;

    await db.read();

    const newPost = {
      id: getNextId('sharePosts'),
      userId,
      title: data.title,
      description: data.description,
      category: data.category,
      quantity: data.quantity,
      location: data.location,
      contact: data.contact,
      status: 'available' as const,
      photos: data.photos || [],
      createdAt: new Date().toISOString()
    };

    db.data.sharePosts.push(newPost);
    await db.write();

    res.json({
      success: true,
      data: formatSharePost(newPost),
      message: '分享发布成功'
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
      error: '发布分享失败'
    });
  }
});

router.put('/:id/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user!.id;

    await db.read();

    const postIndex = db.data.sharePosts.findIndex(p => p.id === parseInt(id));
    if (postIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '分享不存在'
      });
    }

    const post = db.data.sharePosts[postIndex];

    if (post.userId !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '无权限操作'
      });
    }

    if (!['available', 'reserved', 'claimed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: '无效的状态值'
      });
    }

    db.data.sharePosts[postIndex] = { ...post, status };
    await db.write();

    res.json({
      success: true,
      data: formatSharePost(db.data.sharePosts[postIndex]),
      message: '状态更新成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '更新状态失败'
    });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await db.read();

    const postIndex = db.data.sharePosts.findIndex(p => p.id === parseInt(id));
    if (postIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '分享不存在'
      });
    }

    const post = db.data.sharePosts[postIndex];

    if (post.userId !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '无权限删除'
      });
    }

    db.data.sharePosts.splice(postIndex, 1);
    await db.write();

    res.json({
      success: true,
      message: '分享删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '删除失败'
    });
  }
});

export default router;
