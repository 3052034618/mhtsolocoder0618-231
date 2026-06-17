import { Router, Response } from 'express';
import { z } from 'zod';
import { db, getNextId, getPlotById, getUserById, formatBill } from '../db/init.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

const billSchema = z.object({
  plotId: z.number(),
  month: z.string(),
  waterUsage: z.number().min(0),
  electricityUsage: z.number().min(0)
});

const WATER_PRICE = 5;
const ELECTRICITY_PRICE = 12;

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.read();
    const { status, month } = req.query;
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'admin';

    let bills = [...db.data.bills];

    if (!isAdmin) {
      bills = bills.filter(b => b.userId === userId);
    }

    if (status) {
      bills = bills.filter(b => b.status === status);
    }

    if (month) {
      bills = bills.filter(b => b.month === month);
    }

    bills.sort((a, b) => {
      if (a.month !== b.month) {
        return b.month.localeCompare(a.month);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const formattedBills = bills.map(formatBill);

    res.json({
      success: true,
      data: formattedBills
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取账单列表失败'
    });
  }
});

router.post('/', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = billSchema.parse(req.body);

    await db.read();

    const plot = getPlotById(data.plotId);
    if (!plot) {
      return res.status(404).json({
        success: false,
        error: '地块不存在'
      });
    }

    const claim = db.data.claims.find(c => c.plotId === data.plotId && c.status === 'approved');

    if (!claim) {
      return res.status(400).json({
        success: false,
        error: '该地块当前没有认领人'
      });
    }

    const existing = db.data.bills.find(b => b.plotId === data.plotId && b.month === data.month);

    if (existing) {
      return res.status(400).json({
        success: false,
        error: '该地块该月账单已存在'
      });
    }

    const waterFee = data.waterUsage * WATER_PRICE;
    const electricityFee = data.electricityUsage * ELECTRICITY_PRICE;
    const totalAmount = waterFee + electricityFee;

    const newBill = {
      id: getNextId('bills'),
      plotId: data.plotId,
      userId: claim.userId,
      month: data.month,
      waterUsage: data.waterUsage,
      electricityUsage: data.electricityUsage,
      waterFee,
      electricityFee,
      totalAmount,
      status: 'unpaid' as const,
      paidAt: '',
      createdAt: new Date().toISOString()
    };

    db.data.bills.push(newBill);
    await db.write();

    res.json({
      success: true,
      data: formatBill(newBill),
      message: '账单生成成功'
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
      error: '生成账单失败'
    });
  }
});

router.put('/:id/pay', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'admin';

    await db.read();

    const billIndex = db.data.bills.findIndex(b => b.id === parseInt(id));
    if (billIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '账单不存在'
      });
    }

    const bill = db.data.bills[billIndex];

    if (bill.userId !== userId && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: '无权限支付该账单'
      });
    }

    if (bill.status === 'paid') {
      return res.status(400).json({
        success: false,
        error: '该账单已支付'
      });
    }

    db.data.bills[billIndex] = {
      ...bill,
      status: 'paid',
      paidAt: new Date().toISOString()
    };
    await db.write();

    res.json({
      success: true,
      data: formatBill(db.data.bills[billIndex]),
      message: '支付成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '支付失败'
    });
  }
});

router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.read();
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'admin';

    let bills = db.data.bills;
    if (!isAdmin) {
      bills = bills.filter(b => b.userId === userId);
    }

    const unpaidBills = bills.filter(b => b.status === 'unpaid');
    const paidBills = bills.filter(b => b.status === 'paid');

    const unpaidStats = {
      count: unpaidBills.length,
      total: unpaidBills.reduce((sum, b) => sum + b.totalAmount, 0)
    };

    const paidStats = {
      count: paidBills.length,
      total: paidBills.reduce((sum, b) => sum + b.totalAmount, 0)
    };

    res.json({
      success: true,
      data: {
        unpaid: unpaidStats,
        paid: paidStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取统计数据失败'
    });
  }
});

export default router;
