import { Router, Response } from 'express';
import { z } from 'zod';
import { db, getNextId, formatAnnouncement } from '../db/init.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

const announcementSchema = z.object({
  title: z.string().min(2),
  content: z.string().min(10),
  type: z.enum(['maintenance', 'rule', 'event', 'general']),
  priority: z.enum(['normal', 'important', 'urgent']),
  validUntil: z.string().optional()
});

const priorityOrder: Record<string, number> = {
  urgent: 3,
  important: 2,
  normal: 1
};

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.read();
    const { type, priority } = req.query;

    let announcements = [...db.data.announcements];

    if (type) {
      announcements = announcements.filter(a => a.type === type);
    }

    if (priority) {
      announcements = announcements.filter(a => a.priority === priority);
    }

    announcements.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const formatted = announcements.map(formatAnnouncement);

    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取公告列表失败'
    });
  }
});

router.post('/', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.read();
    const data = announcementSchema.parse(req.body);
    const userId = req.user!.id;
    const now = new Date().toISOString();

    const newAnnouncement = {
      id: getNextId('announcements'),
      title: data.title,
      content: data.content,
      type: data.type,
      priority: data.priority,
      createdBy: userId,
      validUntil: data.validUntil || '',
      createdAt: now
    };

    db.data.announcements.push(newAnnouncement);
    await db.write();

    res.json({
      success: true,
      data: formatAnnouncement(newAnnouncement),
      message: '公告发布成功'
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
      error: '发布公告失败'
    });
  }
});

router.put('/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.read();
    const { id } = req.params;
    const data = announcementSchema.parse(req.body);

    const announcementId = parseInt(id);
    const existing = db.data.announcements.find(a => a.id === announcementId);
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: '公告不存在'
      });
    }

    existing.title = data.title;
    existing.content = data.content;
    existing.type = data.type;
    existing.priority = data.priority;
    existing.validUntil = data.validUntil || '';

    await db.write();

    res.json({
      success: true,
      data: formatAnnouncement(existing),
      message: '公告更新成功'
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
      error: '更新公告失败'
    });
  }
});

router.delete('/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.read();
    const { id } = req.params;

    const announcementId = parseInt(id);
    const existingIndex = db.data.announcements.findIndex(a => a.id === announcementId);
    
    if (existingIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '公告不存在'
      });
    }

    db.data.announcements.splice(existingIndex, 1);
    await db.write();

    res.json({
      success: true,
      message: '公告删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '删除公告失败'
    });
  }
});

export default router;
