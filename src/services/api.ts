import type {
  User,
  Plot,
  Claim,
  JournalEntry,
  Announcement,
  SharePost,
  Bill,
  ApiResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest
} from '../../shared/types.js'

const API_BASE_URL = '/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers: HeadersInit = {
    ...options.headers
  }

  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  })

  const data = (await response.json()) as ApiResponse<T>
  return data
}

async function requestData<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const data = await request<T>(endpoint, options)
  if (!data.success) {
    throw new Error(data.error || data.message || '请求失败')
  }
  return data.data as T
}

export const auth = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    return requestData<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    })
  },

  register: async (data: RegisterRequest): Promise<LoginResponse> => {
    return requestData<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  getMe: async (): Promise<User> => {
    return requestData<User>('/auth/me', {
      method: 'GET'
    })
  }
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    return auth.login({ email, password })
  },

  register: async (data: RegisterRequest): Promise<LoginResponse> => {
    return auth.register(data)
  },

  logout: (): void => {
    localStorage.removeItem('token')
  },

  fetchCurrentUser: async (): Promise<User> => {
    return auth.getMe()
  }
}

export const plots = {
  getPlots: async (params?: { status?: string }): Promise<Plot[]> => {
    const query = params?.status ? `?status=${params.status}` : ''
    return requestData<Plot[]>(`/plots${query}`, {
      method: 'GET'
    })
  },

  getPlot: async (id: number): Promise<Plot> => {
    return requestData<Plot>(`/plots/${id}`, {
      method: 'GET'
    })
  },

  createPlot: async (data: Omit<Plot, 'id' | 'createdAt'>): Promise<Plot> => {
    return requestData<Plot>('/plots', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  updatePlot: async (id: number, data: Omit<Plot, 'id' | 'createdAt'>): Promise<Plot> => {
    return requestData<Plot>(`/plots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  },

  deletePlot: async (id: number): Promise<void> => {
    return requestData<void>(`/plots/${id}`, {
      method: 'DELETE'
    })
  }
}

export const claims = {
  getClaims: async (params?: { status?: string }): Promise<Claim[]> => {
    const query = params?.status ? `?status=${params.status}` : ''
    return requestData<Claim[]>(`/claims${query}`, {
      method: 'GET'
    })
  },

  createClaim: async (data: { plotId: number; plantingPlan: string }): Promise<Claim> => {
    return requestData<Claim>('/claims', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  approveClaim: async (id: number, data: { startDate: string; durationMonths: number }): Promise<Claim> => {
    return requestData<Claim>(`/claims/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  },

  rejectClaim: async (id: number, data?: { reason?: string }): Promise<Claim> => {
    return requestData<Claim>(`/claims/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify(data || {})
    })
  },

  renewClaim: async (id: number, data: { durationMonths: number }): Promise<Claim> => {
    return requestData<Claim>(`/claims/${id}/renew`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }
}

export const journal = {
  getJournal: async (plotId: number): Promise<JournalEntry[]> => {
    return requestData<JournalEntry[]>(`/journal/${plotId}`, {
      method: 'GET'
    })
  },

  createJournal: async (data: Omit<JournalEntry, 'id' | 'userId' | 'createdAt'>): Promise<JournalEntry> => {
    return requestData<JournalEntry>('/journal', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  updateJournal: async (id: number, data: Omit<JournalEntry, 'id' | 'userId' | 'createdAt'>): Promise<JournalEntry> => {
    return requestData<JournalEntry>(`/journal/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  },

  deleteJournal: async (id: number): Promise<void> => {
    return requestData<void>(`/journal/${id}`, {
      method: 'DELETE'
    })
  }
}

export const announcements = {
  getAnnouncements: async (params?: { type?: string; priority?: string }): Promise<Announcement[]> => {
    const queryParams = new URLSearchParams()
    if (params?.type) queryParams.append('type', params.type)
    if (params?.priority) queryParams.append('priority', params.priority)
    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return requestData<Announcement[]>(`/announcements${query}`, {
      method: 'GET'
    })
  },

  createAnnouncement: async (data: Omit<Announcement, 'id' | 'createdBy' | 'createdAt'>): Promise<Announcement> => {
    return requestData<Announcement>('/announcements', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  updateAnnouncement: async (id: number, data: Omit<Announcement, 'id' | 'createdBy' | 'createdAt'>): Promise<Announcement> => {
    return requestData<Announcement>(`/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  },

  deleteAnnouncement: async (id: number): Promise<void> => {
    return requestData<void>(`/announcements/${id}`, {
      method: 'DELETE'
    })
  }
}

export const shares = {
  getShares: async (params?: { category?: string; status?: string }): Promise<SharePost[]> => {
    const queryParams = new URLSearchParams()
    if (params?.category) queryParams.append('category', params.category)
    if (params?.status) queryParams.append('status', params.status)
    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return requestData<SharePost[]>(`/shares${query}`, {
      method: 'GET'
    })
  },

  getMyShares: async (): Promise<SharePost[]> => {
    return requestData<SharePost[]>('/shares/my', {
      method: 'GET'
    })
  },

  createShare: async (data: Omit<SharePost, 'id' | 'userId' | 'status' | 'createdAt'>): Promise<SharePost> => {
    return requestData<SharePost>('/shares', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  updateShareStatus: async (id: number, status: 'available' | 'reserved' | 'claimed'): Promise<SharePost> => {
    return requestData<SharePost>(`/shares/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    })
  },

  deleteShare: async (id: number): Promise<void> => {
    return requestData<void>(`/shares/${id}`, {
      method: 'DELETE'
    })
  }
}

export const bills = {
  getBills: async (params?: { status?: string; month?: string }): Promise<Bill[]> => {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append('status', params.status)
    if (params?.month) queryParams.append('month', params.month)
    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return requestData<Bill[]>(`/bills${query}`, {
      method: 'GET'
    })
  },

  createBill: async (data: { plotId: number; month: string; waterUsage: number; electricityUsage: number }): Promise<Bill> => {
    return requestData<Bill>('/bills', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  payBill: async (id: number): Promise<Bill> => {
    return requestData<Bill>(`/bills/${id}/pay`, {
      method: 'PUT'
    })
  },

  getBillStats: async (): Promise<{
    unpaid: { count: number; total: number }
    paid: { count: number; total: number }
  }> => {
    return requestData<{
      unpaid: { count: number; total: number }
      paid: { count: number; total: number }
    }>('/bills/stats', {
      method: 'GET'
    })
  }
}

export const upload = {
  uploadPhotos: async (files: File[]): Promise<{ urls: string[] }> => {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('photos', file)
    })

    return requestData<{ urls: string[] }>('/upload', {
      method: 'POST',
      body: formData
    })
  }
}
