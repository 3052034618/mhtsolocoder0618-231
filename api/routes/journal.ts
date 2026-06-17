import { Router, Response } from 'express';
import { z } from 'zod';
import { db, getNextId, getPlotById, getUserById, formatJournalEntry } from '../db/init.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

const journalSchema = z.object({
  plotId: z.number(),
  date: z.string(),
  planting: z.string().optional(),
  fertilized: z.boolean().default(false),
  fertilizerType: z.string().optional(),
  pests: z.string().optional(),
  notes: z.string().optional(),
  photos: z.array(z.string()).default([])
});

router.get('/:plotId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.read();
    const { plotId } = req.params;

    const entries = db.data.journalEntries
      .filter(e => e.plotId === Number(plotId))
      .sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return b.createdAt.localeCompare(a.createdAt);
      })
      .map(formatJournalEntry);

    res.json({
      success: true,
      data: entries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取种植日志失败'
    });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = journalSchema.parse(req.body);
    const userId = req.user!.id;

    await db.read();

    const plot = getPlotById(data.plotId);
    if (!plot) {
      return res.status(404).json({
        success: false,
        error: '地块不存在'
      });
    }

    const hasPermission = db.data.claims.find(
      c => c.plotId === data.plotId && c.userId === userId && c.status === 'approved'
    );

    if (!hasPermission && req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '无权限记录该地块的日志'
      });
    }

    const newEntry = {
      id: getNextId('journalEntries'),
      plotId: data.plotId,
      userId: userId,
      date: data.date,
      planting: data.planting || '',
      fertilized: data.fertilized,
      fertilizerType: data.fertilizerType || '',
      pests: data.pests || '',
      notes: data.notes || '',
      photos: data.photos || [],
      createdAt: new Date().toISOString()
    };

    db.data.journalEntries.push(newEntry);
    await db.write();

    res.json({
      success: true,
      data: formatJournalEntry(newEntry),
      message: '日志记录成功'
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
      error: '记录日志失败'
    });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = journalSchema.parse(req.body);
    const userId = req.user!.id;

    await db.read();

    const entryIndex = db.data.journalEntries.findIndex(e => e.id === Number(id));
    if (entryIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '日志不存在'
      });
    }

    const entry = db.data.journalEntries[entryIndex];

    if (entry.userId !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '无权限编辑该日志'
      });
    }

    db.data.journalEntries[entryIndex] = {
      ...entry,
      date: data.date,
      planting: data.planting || '',
      fertilized: data.fertilized,
      fertilizerType: data.fertilizerType || '',
      pests: data.pests || '',
      notes: data.notes || '',
      photos: data.photos || []
    };

    await db.write();

    res.json({
      success: true,
      data: formatJournalEntry(db.data.journalEntries[entryIndex]),
      message: '日志更新成功'
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
      error: '更新日志失败'
    });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await db.read();

    const entryIndex = db.data.journalEntries.findIndex(e => e.id === Number(id));
    if (entryIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '日志不存在'
      });
    }

    const entry = db.data.journalEntries[entryIndex];

    if (entry.userId !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '无权限删除该日志'
      });
    }

    db.data.journalEntries.splice(entryIndex, 1);
    await db.write();

    res.json({
      success: true,
      message: '日志删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '删除日志失败'
    });
  }
});

export default router;
