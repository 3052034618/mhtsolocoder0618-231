import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import type { User, Plot, Claim, JournalEntry, Announcement, SharePost, Bill } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Database {
  users: User[];
  plots: Plot[];
  claims: Claim[];
  journalEntries: JournalEntry[];
  announcements: Announcement[];
  sharePosts: SharePost[];
  bills: Bill[];
}

const dbPath = path.join(__dirname, '..', '..', 'db.json');
const adapter = new JSONFile<Database>(dbPath);
const defaultData: Database = {
  users: [],
  plots: [],
  claims: [],
  journalEntries: [],
  announcements: [],
  sharePosts: [],
  bills: []
};

export const db = new Low<Database>(adapter, defaultData);

let nextId: Record<string, number> = {
  users: 1,
  plots: 1,
  claims: 1,
  journalEntries: 1,
  announcements: 1,
  sharePosts: 1,
  bills: 1
};

export function getNextId(table: keyof Database): number {
  return nextId[table]++;
}

export async function initDatabase() {
  await db.read();

  if (db.data.users.length > 0) {
    const maxIds: Record<string, number> = {};
    Object.keys(db.data).forEach(key => {
      const table = key as keyof Database;
      maxIds[key] = db.data[table].length > 0
        ? Math.max(...db.data[table].map((item: any) => item.id)) + 1
        : 1;
    });
    nextId = maxIds as typeof nextId;
  }

  if (db.data.users.length === 0) {
    seedData();
    await db.write();
  }
}

function seedData() {
  const now = new Date().toISOString();

  const adminHash = bcrypt.hashSync('admin123', 10);
  db.data.users.push({
    id: getNextId('users'),
    username: '管理员',
    email: 'admin@garden.com',
    role: 'admin',
    phone: '13800138000',
    address: '花园管理办公室',
    avatar: '',
    createdAt: now
  });

  const gardenerHash = bcrypt.hashSync('123456', 10);
  const users: Omit<User, 'id' | 'createdAt'>[] = [
    { username: '张园丁', email: 'zhang@garden.com', role: 'gardener', phone: '13900139001', address: '阳光小区1栋', avatar: '' },
    { username: '李园丁', email: 'li@garden.com', role: 'gardener', phone: '13900139002', address: '幸福小区2栋', avatar: '' },
    { username: '王园丁', email: 'wang@garden.com', role: 'gardener', phone: '13900139003', address: '和平小区3栋', avatar: '' },
  ];
  users.forEach(u => {
    db.data.users.push({
      ...u,
      id: getNextId('users'),
      createdAt: now
    });
  });

  const plots: Omit<Plot, 'id' | 'createdAt'>[] = [
    { plotNumber: 'A01', area: 15.5, status: 'available', location: '东区第一排', description: '阳光充足，适合种植蔬菜' },
    { plotNumber: 'A02', area: 12.0, status: 'claimed', location: '东区第一排', description: '靠近水源，灌溉方便' },
    { plotNumber: 'A03', area: 18.0, status: 'available', location: '东区第二排', description: '面积较大，适合多种作物' },
    { plotNumber: 'B01', area: 10.0, status: 'maintenance', location: '西区第一排', description: '土壤改良中，暂不可认领' },
    { plotNumber: 'B02', area: 14.5, status: 'available', location: '西区第一排', description: '通风良好，适合瓜果类' },
    { plotNumber: 'B03', area: 16.0, status: 'claimed', location: '西区第二排', description: '有遮阳网，适合喜阴植物' },
    { plotNumber: 'C01', area: 20.0, status: 'available', location: '南区', description: '靠近公共堆肥区' },
    { plotNumber: 'C02', area: 13.0, status: 'available', location: '南区', description: '新开辟地块，土壤肥沃' },
  ];
  plots.forEach(p => {
    db.data.plots.push({
      ...p,
      id: getNextId('plots'),
      createdAt: now
    });
  });

  const startDate = '2026-01-01';
  const endDate = '2026-12-31';

  db.data.claims.push({
    id: getNextId('claims'),
    plotId: 2,
    userId: 2,
    status: 'approved',
    startDate,
    endDate,
    plantingPlan: '计划种植番茄、黄瓜和生菜',
    createdAt: now,
    approvedAt: now
  });

  db.data.claims.push({
    id: getNextId('claims'),
    plotId: 6,
    userId: 3,
    status: 'approved',
    startDate,
    endDate,
    plantingPlan: '主要种植绿叶蔬菜和香草',
    createdAt: now,
    approvedAt: now
  });

  db.data.claims.push({
    id: getNextId('claims'),
    plotId: 1,
    userId: 4,
    status: 'pending',
    startDate: '',
    endDate: '',
    plantingPlan: '想种一些根茎类蔬菜',
    createdAt: now,
    approvedAt: ''
  });

  const journalEntries: Omit<JournalEntry, 'id' | 'createdAt'>[] = [
    { plotId: 2, userId: 2, date: '2026-03-01', planting: '播种番茄种子10粒，黄瓜种子8粒', fertilized: true, fertilizerType: '有机堆肥', pests: '', notes: '今天天气很好，适合播种', photos: [] },
    { plotId: 2, userId: 2, date: '2026-03-15', planting: '番茄发芽了，长出2片真叶', fertilized: false, fertilizerType: '', pests: '', notes: '需要间苗，保持适当间距', photos: [] },
    { plotId: 2, userId: 2, date: '2026-04-01', planting: '移栽黄瓜苗，搭建支架', fertilized: true, fertilizerType: '复合肥', pests: '发现少量蚜虫', notes: '用大蒜水喷雾防治蚜虫效果不错', photos: [] },
    { plotId: 6, userId: 3, date: '2026-03-10', planting: '种植生菜、油麦菜、菠菜', fertilized: false, fertilizerType: '', pests: '', notes: '土壤湿度适中，出苗应该不错', photos: [] },
    { plotId: 6, userId: 3, date: '2026-03-25', planting: '间苗，追施稀薄液肥', fertilized: true, fertilizerType: '腐熟饼肥水', pests: '', notes: '生菜长势喜人', photos: [] },
  ];
  journalEntries.forEach(j => {
    db.data.journalEntries.push({
      ...j,
      id: getNextId('journalEntries'),
      createdAt: now
    });
  });

  const announcements: Omit<Announcement, 'id' | 'createdAt'>[] = [
    {
      title: '公共区域维护排班通知',
      content: '各位园丁请注意，本月公共区域维护排班如下：\n第一周：张园丁\n第二周：李园丁\n第三周：王园丁\n第四周：全体园丁\n请各位按时完成维护工作，保持花园整洁。',
      type: 'maintenance',
      priority: 'important',
      createdBy: 1,
      validUntil: '2026-06-30'
    },
    {
      title: '堆肥使用规则说明',
      content: '为了更好地使用公共堆肥区，请遵守以下规则：\n1. 只可投入植物性垃圾，禁止投入肉类、油脂等\n2. 请将大的枝叶切碎后再投入\n3. 定期翻动堆肥，促进腐熟\n4. 腐熟的堆肥可免费取用，但请适量\n感谢大家的配合！',
      type: 'rule',
      priority: 'normal',
      createdBy: 1,
      validUntil: ''
    },
    {
      title: '夏季防虫温馨提示',
      content: '夏季来临，气温升高，病虫害进入高发期。建议大家：\n1. 定期检查叶片背面，及早发现虫害\n2. 优先使用生物防治方法，如天敌、大蒜水等\n3. 及时清除病叶病株，防止蔓延\n4. 保持通风透光，减少病害发生\n如有疑问可在群内交流。',
      type: 'general',
      priority: 'urgent',
      createdBy: 1,
      validUntil: '2026-08-31'
    },
  ];
  announcements.forEach(a => {
    db.data.announcements.push({
      ...a,
      id: getNextId('announcements'),
      createdAt: now
    });
  });

  const sharePosts: Omit<SharePost, 'id' | 'createdAt'>[] = [
    {
      userId: 2,
      title: '免费赠送番茄幼苗',
      description: '自家育苗多了20棵番茄幼苗，品种是千禧小番茄，抗病性强。免费赠送给需要的园丁，先到先得。',
      category: 'seedling',
      quantity: 20,
      location: '花园入口保安室',
      contact: '微信：zhang123',
      status: 'available',
      photos: []
    },
    {
      userId: 3,
      title: '分享生菜种子',
      description: '今年收获的生菜种子，已经晾干保存好。有约50克，免费分发给大家。适合秋播。',
      category: 'seeds',
      quantity: 50,
      location: 'C02地块',
      contact: '电话：13900139002',
      status: 'reserved',
      photos: []
    },
  ];
  sharePosts.forEach(s => {
    db.data.sharePosts.push({
      ...s,
      id: getNextId('sharePosts'),
      createdAt: now
    });
  });

  const bills: Omit<Bill, 'id' | 'createdAt'>[] = [
    { plotId: 2, userId: 2, month: '2026-05', waterUsage: 2.5, electricityUsage: 1.2, waterFee: 12.5, electricityFee: 14.4, totalAmount: 26.9, status: 'paid', paidAt: now },
    { plotId: 6, userId: 3, month: '2026-05', waterUsage: 3.0, electricityUsage: 0.8, waterFee: 15.0, electricityFee: 9.6, totalAmount: 24.6, status: 'unpaid', paidAt: '' },
    { plotId: 2, userId: 2, month: '2026-06', waterUsage: 1.8, electricityUsage: 1.0, waterFee: 9.0, electricityFee: 12.0, totalAmount: 21.0, status: 'unpaid', paidAt: '' },
    { plotId: 6, userId: 3, month: '2026-06', waterUsage: 2.2, electricityUsage: 0.5, waterFee: 11.0, electricityFee: 6.0, totalAmount: 17.0, status: 'unpaid', paidAt: '' },
  ];
  bills.forEach(b => {
    db.data.bills.push({
      ...b,
      id: getNextId('bills'),
      createdAt: now
    });
  });
}

export function getUserById(userId: number): User | undefined {
  return db.data.users.find(u => u.id === userId);
}

export function getPlotById(plotId: number): Plot | undefined {
  return db.data.plots.find(p => p.id === plotId);
}

export function getCurrentClaim(plotId: number): (Claim & { user?: User }) | undefined {
  const claim = db.data.claims.find(c => c.plotId === plotId && c.status === 'approved');
  if (claim) {
    return { ...claim, user: getUserById(claim.userId) };
  }
  return undefined;
}

export function formatPlot(plot: Plot): Plot & { currentGardener?: User; currentClaim?: Claim & { user?: User } } {
  const claim = getCurrentClaim(plot.id);
  return {
    ...plot,
    currentClaim: claim,
    currentGardener: claim?.user
  };
}

export function formatClaim(claim: Claim): Claim & { user?: User; plot?: Plot } {
  return {
    ...claim,
    user: getUserById(claim.userId),
    plot: getPlotById(claim.plotId)
  };
}

export function formatJournalEntry(entry: JournalEntry): JournalEntry & { user?: User } {
  return {
    ...entry,
    user: getUserById(entry.userId)
  };
}

export function formatAnnouncement(ann: Announcement): Announcement & { creator?: User } {
  return {
    ...ann,
    creator: getUserById(ann.createdBy)
  };
}

export function formatSharePost(post: SharePost): SharePost & { user?: User } {
  return {
    ...post,
    user: getUserById(post.userId)
  };
}

export function formatBill(bill: Bill): Bill & { plot?: Plot; user?: User } {
  return {
    ...bill,
    plot: getPlotById(bill.plotId),
    user: getUserById(bill.userId)
  };
}
