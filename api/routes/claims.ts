import { Router, Response } from 'express';
import { z } from 'zod';
import { db, getNextId, getPlotById, getUserById, formatClaim, formatPlot } from '../db/init.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';
import { addMonths, formatISO } from 'date-fns';

const router = Router();

const claimSchema = z.object({
  plotId: z.number(),
  plantingPlan: z.string().min(10)
});

const approveSchema = z.object({
  startDate: z.string(),
  durationMonths: z.number().min(1).max(24)
});

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.read();
    const { status } = req.query;
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'admin';

    let claims = [...db.data.claims];

    if (!isAdmin) {
      claims = claims.filter(c => c.userId === userId);
    }

    if (status) {
      claims = claims.filter(c => c.status === status);
    }

    claims.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      data: claims.map(formatClaim)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取认领列表失败'
    });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { plotId, plantingPlan } = claimSchema.parse(req.body);
    const userId = req.user!.id;

    await db.read();

    const plot = getPlotById(plotId);
    if (!plot) {
      return res.status(404).json({
        success: false,
        error: '地块不存在'
      });
    }

    const existingClaim = db.data.claims.find(c => 
      c.userId === userId && ['pending', 'approved', 'waiting'].includes(c.status)
    );

    if (existingClaim) {
      return res.status(400).json({
        success: false,
        error: '您已有待处理或已通过的认领申请'
      });
    }

    const hasActiveClaim = db.data.claims.find(c => 
      c.plotId === plotId && c.status === 'approved'
    );

    let claimStatus: 'pending' | 'waiting' = 'pending';
    if (plot.status !== 'available' || hasActiveClaim) {
      claimStatus = 'waiting';
    }

    const now = new Date().toISOString();
    const newClaim = {
      id: getNextId('claims'),
      plotId,
      userId,
      status: claimStatus,
      startDate: '',
      endDate: '',
      plantingPlan,
      createdAt: now,
      approvedAt: ''
    };

    db.data.claims.push(newClaim);
    await db.write();

    res.json({
      success: true,
      data: formatClaim(newClaim),
      message: claimStatus === 'waiting' 
        ? '申请已提交，当前地块已被认领，您已进入等待列表' 
        : '申请已提交，请等待管理员审核'
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
      error: '提交申请失败'
    });
  }
});

router.put('/:id/approve', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, durationMonths } = approveSchema.parse(req.body);
    const { id } = req.params;
    const claimId = parseInt(id);

    await db.read();

    const claimIndex = db.data.claims.findIndex(c => c.id === claimId);
    if (claimIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '认领申请不存在'
      });
    }

    const claim = db.data.claims[claimIndex];
    if (claim.status !== 'pending' && claim.status !== 'waiting') {
      return res.status(400).json({
        success: false,
        error: '该申请状态不允许审核'
      });
    }

    const endDate = formatISO(addMonths(new Date(startDate), durationMonths), { representation: 'date' });
    const now = new Date().toISOString();

    db.data.claims[claimIndex] = {
      ...claim,
      status: 'approved',
      startDate,
      endDate,
      approvedAt: now
    };

    const plotIndex = db.data.plots.findIndex(p => p.id === claim.plotId);
    if (plotIndex !== -1) {
      db.data.plots[plotIndex] = {
        ...db.data.plots[plotIndex],
        status: 'claimed'
      };
    }

    await db.write();

    const updatedClaim = db.data.claims[claimIndex];

    res.json({
      success: true,
      data: formatClaim(updatedClaim),
      message: '认领审核通过'
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
      error: '审核失败'
    });
  }
});

router.put('/:id/reject', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const claimId = parseInt(id);

    await db.read();

    const claimIndex = db.data.claims.findIndex(c => c.id === claimId);
    if (claimIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '认领申请不存在'
      });
    }

    const claim = db.data.claims[claimIndex];
    if (claim.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: '只有待审核的申请可以被拒绝'
      });
    }

    db.data.claims[claimIndex] = {
      ...claim,
      status: 'rejected'
    };

    await db.write();

    const updatedClaim = db.data.claims[claimIndex];

    res.json({
      success: true,
      data: formatClaim(updatedClaim),
      message: '申请已拒绝'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '操作失败'
    });
  }
});

router.put('/:id/move-to-waiting', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const claimId = parseInt(id);

    await db.read();

    const claimIndex = db.data.claims.findIndex(c => c.id === claimId);
    if (claimIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '认领申请不存在'
      });
    }

    const claim = db.data.claims[claimIndex];
    if (claim.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: '只有待审核的申请可以移入等待列表'
      });
    }

    db.data.claims[claimIndex] = {
      ...claim,
      status: 'waiting'
    };

    await db.write();

    const updatedClaim = db.data.claims[claimIndex];

    res.json({
      success: true,
      data: formatClaim(updatedClaim),
      message: '已移入等待列表'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '操作失败'
    });
  }
});

router.put('/:id/release', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const claimId = parseInt(id);
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'admin';

    await db.read();

    const claimIndex = db.data.claims.findIndex(c => c.id === claimId);
    if (claimIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '认领记录不存在'
      });
    }

    const claim = db.data.claims[claimIndex];
    if (claim.userId !== userId && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: '无权限操作'
      });
    }

    if (claim.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: '只有生效中的认领可以释放'
      });
    }

    db.data.claims[claimIndex] = {
      ...claim,
      status: 'expired'
    };

    const plotIndex = db.data.plots.findIndex(p => p.id === claim.plotId);

    const nextWaitingClaim = db.data.claims
      .filter(c => c.plotId === claim.plotId && c.status === 'waiting')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];

    let message = '地块已释放';
    if (nextWaitingClaim) {
      const nextClaimIndex = db.data.claims.findIndex(c => c.id === nextWaitingClaim.id);
      const now = new Date();
      const startDate = formatISO(now, { representation: 'date' });
      const endDate = formatISO(addMonths(now, 12), { representation: 'date' });

      db.data.claims[nextClaimIndex] = {
        ...nextWaitingClaim,
        status: 'approved',
        startDate,
        endDate,
        approvedAt: now.toISOString()
      };

      if (plotIndex !== -1) {
        db.data.plots[plotIndex] = {
          ...db.data.plots[plotIndex],
          status: 'claimed'
        };
      }

      const nextUser = getUserById(nextWaitingClaim.userId);
      const nextPlot = getPlotById(nextWaitingClaim.plotId);
      message = `地块已释放，等待队列中${nextUser ? '的 ' + nextUser.username : '最早申请人'}已自动接手${nextPlot ? '（地块：' + nextPlot.plotNumber + '）' : ''}，有效期至 ${endDate}`;
    } else {
      if (plotIndex !== -1) {
        db.data.plots[plotIndex] = {
          ...db.data.plots[plotIndex],
          status: 'available'
        };
      }
      message = '地块已释放，当前没有等待申请，地块已恢复为空闲状态';
    }

    await db.write();

    res.json({
      success: true,
      data: formatClaim(db.data.claims[claimIndex]),
      message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '释放地块失败'
    });
  }
});

router.get('/waiting/grouped', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.read();
    const isAdmin = req.user!.role === 'admin';
    const userId = req.user!.id;

    let waitingClaims = db.data.claims.filter(c => c.status === 'waiting');

    if (!isAdmin) {
      waitingClaims = waitingClaims.filter(c => c.userId === userId);
    }

    const grouped: Record<number, {
      plot: ReturnType<typeof formatPlot>;
      queue: (ReturnType<typeof formatClaim> & { position: number })[];
    }> = {};

    const plotWaitingMap: Record<number, typeof waitingClaims> = {};
    waitingClaims.forEach(c => {
      if (!plotWaitingMap[c.plotId]) {
        plotWaitingMap[c.plotId] = [];
      }
      plotWaitingMap[c.plotId].push(c);
    });

    Object.keys(plotWaitingMap).forEach(pid => {
      const plotId = parseInt(pid);
      const plot = getPlotById(plotId);
      if (!plot) return;

      const queue = plotWaitingMap[plotId]
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((c, idx) => ({
          ...formatClaim(c),
          position: idx + 1
        }));

      grouped[plotId] = {
        plot: formatPlot(plot),
        queue
      };
    });

    const result = Object.values(grouped).sort((a, b) =>
      a.plot.plotNumber.localeCompare(b.plot.plotNumber)
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取等待列表失败'
    });
  }
});

router.put('/:id/move-up', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const claimId = parseInt(id);

    await db.read();

    const claimIndex = db.data.claims.findIndex(c => c.id === claimId);
    if (claimIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '申请不存在'
      });
    }

    const claim = db.data.claims[claimIndex];
    if (claim.status !== 'waiting') {
      return res.status(400).json({
        success: false,
        error: '只有等待中的申请可以调整顺序'
      });
    }

    const samePlotWaiting = db.data.claims
      .filter(c => c.plotId === claim.plotId && c.status === 'waiting')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const currentPos = samePlotWaiting.findIndex(c => c.id === claimId);
    if (currentPos <= 0) {
      return res.status(400).json({
        success: false,
        error: '该申请已经是队列第一位'
      });
    }

    const prevClaim = samePlotWaiting[currentPos - 1];
    const prevCreatedAt = prevClaim.createdAt;
    const currentCreatedAt = claim.createdAt;

    const prevIndex = db.data.claims.findIndex(c => c.id === prevClaim.id);
    db.data.claims[prevIndex] = { ...prevClaim, createdAt: currentCreatedAt };
    db.data.claims[claimIndex] = { ...claim, createdAt: prevCreatedAt };

    await db.write();

    res.json({
      success: true,
      data: formatClaim(db.data.claims[claimIndex]),
      message: '已提前一位'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '操作失败'
    });
  }
});

router.put('/:id/remove-from-waiting', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const claimId = parseInt(id);

    await db.read();

    const claimIndex = db.data.claims.findIndex(c => c.id === claimId);
    if (claimIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '申请不存在'
      });
    }

    const claim = db.data.claims[claimIndex];
    if (claim.status !== 'waiting') {
      return res.status(400).json({
        success: false,
        error: '只有等待中的申请可以移出'
      });
    }

    db.data.claims[claimIndex] = { ...claim, status: 'rejected' };
    await db.write();

    res.json({
      success: true,
      data: formatClaim(db.data.claims[claimIndex]),
      message: '已移出等待队列'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '操作失败'
    });
  }
});

router.put('/:id/assign-now', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { durationMonths } = req.body;
    const claimId = parseInt(id);

    await db.read();

    const claimIndex = db.data.claims.findIndex(c => c.id === claimId);
    if (claimIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '申请不存在'
      });
    }

    const claim = db.data.claims[claimIndex];
    if (claim.status !== 'waiting') {
      return res.status(400).json({
        success: false,
        error: '只有等待中的申请可以直接分配'
      });
    }

    const now = new Date();
    const startDate = formatISO(now, { representation: 'date' });
    const endDate = formatISO(addMonths(now, durationMonths || 12), { representation: 'date' });

    const activeClaim = db.data.claims.find(
      c => c.plotId === claim.plotId && c.status === 'approved'
    );
    if (activeClaim) {
      const activeIndex = db.data.claims.findIndex(c => c.id === activeClaim.id);
      db.data.claims[activeIndex] = { ...activeClaim, status: 'expired' };
    }

    db.data.claims[claimIndex] = {
      ...claim,
      status: 'approved',
      startDate,
      endDate,
      approvedAt: now.toISOString()
    };

    const plotIndex = db.data.plots.findIndex(p => p.id === claim.plotId);
    if (plotIndex !== -1) {
      db.data.plots[plotIndex] = {
        ...db.data.plots[plotIndex],
        status: 'claimed'
      };
    }

    await db.write();

    const assignedUser = getUserById(claim.userId);
    res.json({
      success: true,
      data: formatClaim(db.data.claims[claimIndex]),
      message: `已直接分配给${assignedUser ? ' ' + assignedUser.username : '申请人'}，有效期至 ${endDate}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '分配失败'
    });
  }
});

router.put('/:id/renew', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { durationMonths } = req.body;
    const userId = req.user!.id;
    const claimId = parseInt(id);

    await db.read();

    const claimIndex = db.data.claims.findIndex(c => c.id === claimId);
    if (claimIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '认领记录不存在'
      });
    }

    const claim = db.data.claims[claimIndex];
    if (claim.userId !== userId && req.user!.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '无权限操作'
      });
    }

    if (claim.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: '该认领状态不允许续期'
      });
    }

    const newEndDate = formatISO(addMonths(new Date(claim.endDate), durationMonths || 12), { representation: 'date' });

    db.data.claims[claimIndex] = {
      ...claim,
      endDate: newEndDate
    };

    await db.write();

    const updatedClaim = db.data.claims[claimIndex];

    res.json({
      success: true,
      data: formatClaim(updatedClaim),
      message: '续期成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '续期失败'
    });
  }
});

export default router;
