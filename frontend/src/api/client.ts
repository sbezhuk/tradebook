import type {
  AuthResponse,
  User,
  Trade,
  TradeFormData,
  AnalyticsData,
  HyperliquidImportResponse,
  Deposit,
  DepositFormData,
  DepositListResponse,
} from '../types';

const API_BASE = '/api/v1';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('tradebook_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('tradebook_token', token);
    } else {
      localStorage.removeItem('tradebook_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.setToken(null);
      window.dispatchEvent(new Event('auth:unauthorized'));
      throw new Error('Сесія завершилась. Будь ласка, увійдіть знову.');
    }

    if (!response.ok) {
      let errorMessage = 'Сталася помилка при запиті';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        // fallback
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Auth
  async register(data: { email: string; username: string; password: string }): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(res.access_token);
    return res;
  }

  async login(data: { username_or_email: string; password: string }): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(res.access_token);
    return res;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // Trades
  async getTrades(params: Record<string, string | number | undefined> = {}): Promise<{ items: Trade[]; total: number }> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ items: Trade[]; total: number }>(`/trades${qs}`);
  }

  async getTrade(id: number): Promise<Trade> {
    return this.request<Trade>(`/trades/${id}`);
  }

  async createTrade(data: TradeFormData): Promise<Trade> {
    return this.request<Trade>('/trades', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTrade(id: number, data: Partial<TradeFormData>): Promise<Trade> {
    return this.request<Trade>(`/trades/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTrade(id: number): Promise<void> {
    return this.request<void>(`/trades/${id}`, {
      method: 'DELETE',
    });
  }

  async deleteAllTrades(): Promise<{ deleted_count: number }> {
    return this.request<{ deleted_count: number }>('/trades', {
      method: 'DELETE',
    });
  }

  async getTags(): Promise<string[]> {
    return this.request<string[]>('/trades/tags/all');
  }

  // Analytics
  async getAnalytics(month?: string): Promise<AnalyticsData> {
    const qs = month ? `?month=${encodeURIComponent(month)}` : '';
    return this.request<AnalyticsData>(`/analytics${qs}`);
  }

  // Deposits
  async getDeposits(): Promise<DepositListResponse> {
    return this.request<DepositListResponse>('/deposits');
  }

  async createDeposit(data: DepositFormData): Promise<Deposit> {
    return this.request<Deposit>('/deposits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteDeposit(id: number): Promise<void> {
    return this.request<void>(`/deposits/${id}`, {
      method: 'DELETE',
    });
  }

  // Import Hyperliquid CSV
  async importHyperliquidCsv(file: File): Promise<HyperliquidImportResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}/trades/import/hyperliquid`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (response.status === 401) {
      this.setToken(null);
      window.dispatchEvent(new Event('auth:unauthorized'));
      throw new Error('Сесія завершилась. Будь ласка, увійдіть знову.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Не вдалося імпортувати файл Hyperliquid');
    }

    return response.json();
  }

  // File Upload
  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}/upload/image`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Не вдалося завантажити зображення');
    }

    return response.json();
  }
}

export const api = new ApiClient();
