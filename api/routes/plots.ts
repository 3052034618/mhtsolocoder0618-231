import { Router, Response } from 'express';
import { z } from 'zod';
import { db, getNextId, getPlotById, formatPlot } from '../db/init.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

const plotSchema = z.object({
  plotNumber: z.string(),
  area: z.number().positive(),
  status: z.enum(['available', 'claimed', 'maintenance']),
  location: z.string().optional(),
  description: z.string().optional()
});

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.read();
    const { status, page = 1, pageSize = 20 } = req.query;

    let plots = [...db.data.plots];

    if (status) {
      plots = plots.filter(p => p.status === status);
    }

    plots.sort((a, b) => a.plotNumber.localeCompare(b.plotNumber));

    const formattedPlots = plots.map(formatPlot);

    res.json({
      success: true,
      data: formattedPlots
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取地块列表失败'
    });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.read();
    const plot = getPlotById(Number(req.params.id));
    if (!plot) {
      return res.status(404).json({
        success: false,
        error: '地块不存在'
      });
    }

    res.json({
      success: true,
      data: formatPlot(plot)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取地块详情失败'
    });
  }
});

router.post('/', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.read();
    const data = plotSchema.parse(req.body);

    const existing = db.data.plots.find(p => p.plotNumber === data.plotNumber);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: '地块编号已存在'
      });
    }

    const newPlot = {
      id: getNextId('plots'),
      plotNumber: data.plotNumber,
      area: data.area,
      status: data.status,
      location: data.location || '',
      description: data.description || '',
      createdAt: new Date().toISOString()
    };

    db.data.plots.push(newPlot);
    await db.write();

    res.json({
      success: true,
      data: formatPlot(newPlot),
      message: '地块创建成功'
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
      error: '创建地块失败'
    });
  }
});

router.put('/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.read();
    const data = plotSchema.parse(req.body);
    const id = Number(req.params.id);

    const existingIndex = db.data.plots.findIndex(p => p.id === id);
    if (existingIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '地块不存在'
      });
    }

    const duplicate = db.data.plots.find(p => p.plotNumber === data.plotNumber && p.id !== id);
    if (duplicate) {
      return res.status(400).json({
        success: false,
        error: '地块编号已存在'
      });
    }

    const updatedPlot = {
      ...db.data.plots[existingIndex],
      plotNumber: data.plotNumber,
      area: data.area,
      status: data.status,
      location: data.location || '',
      description: data.description || ''
    };

    db.data.plots[existingIndex] = updatedPlot;
    await db.write();

    res.json({
      success: true,
      data: formatPlot(updatedPlot),
      message: '地块更新成功'
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
      error: '更新地块失败'
    });
  }
});

router.delete('/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.read();
    const id = Number(req.params.id);

    const existing = getPlotById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: '地块不存在'
      });
    }

    const hasClaims = db.data.claims.find(c => c.plotId === id);
    if (hasClaims) {
      return res.status(400).json({
        success: false,
        error: '该地块有关联的认领记录，无法删除'
      });
    }

    db.data.plots = db.data.plots.filter(p => p.id !== id);
    await db.write();

    res.json({
      success: true,
      message: '地块删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '删除地块失败'
    });
  }
});

export default router;
