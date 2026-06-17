export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'gardener';
  phone: string;
  address: string;
  avatar: string;
  createdAt: string;
}

export interface Plot {
  id: number;
  plotNumber: string;
  area: number;
  status: 'available' | 'claimed' | 'maintenance';
  location: string;
  description: string;
  createdAt: string;
  currentGardener?: User;
  currentClaim?: Claim;
}

export interface Claim {
  id: number;
  plotId: number;
  userId: number;
  status: 'pending' | 'approved' | 'rejected' | 'waiting';
  startDate: string;
  endDate: string;
  plantingPlan: string;
  createdAt: string;
  approvedAt: string;
  user?: User;
  plot?: Plot;
}

export interface JournalEntry {
  id: number;
  plotId: number;
  userId: number;
  date: string;
  planting: string;
  fertilized: boolean;
  fertilizerType: string;
  pests: string;
  notes: string;
  photos: string[];
  createdAt: string;
  user?: User;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  type: 'maintenance' | 'rule' | 'event' | 'general';
  priority: 'normal' | 'important' | 'urgent';
  createdBy: number;
  validUntil: string;
  createdAt: string;
  creator?: User;
}

export interface SharePost {
  id: number;
  userId: number;
  title: string;
  description: string;
  category: 'seeds' | 'seedling' | 'tool' | 'other';
  quantity: number;
  location: string;
  contact: string;
  status: 'available' | 'reserved' | 'claimed';
  photos: string[];
  createdAt: string;
  user?: User;
}

export interface Bill {
  id: number;
  plotId: number;
  userId: number;
  month: string;
  waterUsage: number;
  electricityUsage: number;
  waterFee: number;
  electricityFee: number;
  totalAmount: number;
  status: 'unpaid' | 'paid';
  paidAt: string;
  createdAt: string;
  plot?: Plot;
  user?: User;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  phone: string;
}
