import type {
  AuthResponse,
  User,
  Trade,
  TradeFormData,
  AnalyticsData,
  HyperliquidImportResponse,
  HyperliquidDepositImportResponse,
  HyperliquidFundingImportResponse,
  Deposit,
  DepositFormData,
  DepositListResponse,
  FundingPayment,
  FundingFormData,
  FundingUpdateData,
  FundingListResponse,
  TradingAccount,
  AccountFormData,
  AccountListResponse,
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

  // Accounts
  async getAccounts(): Promise<AccountListResponse> {
    return this.request<AccountListResponse>('/accounts');
  }

  async createAccount(data: AccountFormData): Promise<TradingAccount> {
    return this.request<TradingAccount>('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAccount(id: number, data: Partial<AccountFormData>): Promise<TradingAccount> {
    return this.request<TradingAccount>(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAccount(id: number, deleteData = false): Promise<void> {
    return this.request<void>(`/accounts/${id}?delete_data=${deleteData ? 'true' : 'false'}`, {
      method: 'DELETE',
    });
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

  async deleteAllTrades(accountId?: number | null): Promise<{ deleted_count: number }> {
    const qs = accountId ? `?account_id=${accountId}` : '';
    return this.request<{ deleted_count: number }>(`/trades${qs}`, {
      method: 'DELETE',
    });
  }

  async getTags(accountId?: number | null): Promise<string[]> {
    const qs = accountId ? `?account_id=${accountId}` : '';
    return this.request<string[]>(`/trades/tags/all${qs}`);
  }

  // Analytics
  async getAnalytics(month?: string, accountId?: number | null): Promise<AnalyticsData> {
    const query = new URLSearchParams();
    if (month) query.append('month', month);
    if (accountId) query.append('account_id', String(accountId));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<AnalyticsData>(`/analytics${qs}`);
  }

  // Deposits
  async getDeposits(accountId?: number | null): Promise<DepositListResponse> {
    const qs = accountId ? `?account_id=${accountId}` : '';
    return this.request<DepositListResponse>(`/deposits${qs}`);
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

  // Funding
  async getFunding(
    accountId?: number | null,
    coin?: string,
    direction?: string,
    limit: number = 100,
    skip: number = 0
  ): Promise<FundingListResponse> {
    const params = new URLSearchParams();
    if (accountId) params.set('account_id', String(accountId));
    if (coin) params.set('coin', coin);
    if (direction) params.set('direction', direction);
    if (limit) params.set('limit', String(limit));
    if (skip) params.set('skip', String(skip));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<FundingListResponse>(`/funding${qs}`);
  }

  async createFunding(data: FundingFormData): Promise<FundingPayment> {
    return this.request<FundingPayment>('/funding', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFunding(id: number, data: FundingUpdateData): Promise<FundingPayment> {
    return this.request<FundingPayment>(`/funding/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async linkTradeToFunding(fundingId: number, tradeId: number | null): Promise<FundingPayment> {
    return this.request<FundingPayment>(`/funding/${fundingId}/link-trade`, {
      method: 'POST',
      body: JSON.stringify({ trade_id: tradeId }),
    });
  }

  async deleteFunding(id: number): Promise<void> {
    return this.request<void>(`/funding/${id}`, {
      method: 'DELETE',
    });
  }

  async deleteAllFunding(accountId?: number | null): Promise<{ deleted_count: number }> {
    const qs = accountId ? `?account_id=${accountId}` : '';
    return this.request<{ deleted_count: number }>(`/funding${qs}`, {
      method: 'DELETE',
    });
  }

  private async uploadFile<T>(endpoint: string, file: File, fallbackError: string): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
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
      throw new Error(errorData.detail || fallbackError);
    }

    return response.json();
  }

  // Import Hyperliquid CSV
  async importHyperliquidCsv(file: File, accountId?: number | null): Promise<HyperliquidImportResponse> {
    const qs = accountId ? `?account_id=${accountId}` : '';
    return this.uploadFile<HyperliquidImportResponse>(
      `/trades/import/hyperliquid${qs}`,
      file,
      'Не вдалося імпортувати файл Hyperliquid'
    );
  }

  async importHyperliquidDepositsCsv(
    file: File,
    accountId?: number | null
  ): Promise<HyperliquidDepositImportResponse> {
    const qs = accountId ? `?account_id=${accountId}` : '';
    return this.uploadFile<HyperliquidDepositImportResponse>(
      `/deposits/import/hyperliquid${qs}`,
      file,
      'Не вдалося імпортувати депозити з файлу Hyperliquid'
    );
  }

  async importHyperliquidFundingCsv(
    file: File,
    accountId?: number | null
  ): Promise<HyperliquidFundingImportResponse> {
    const qs = accountId ? `?account_id=${accountId}` : '';
    return this.uploadFile<HyperliquidFundingImportResponse>(
      `/trades/import/hyperliquid/funding${qs}`,
      file,
      'Не вдалося імпортувати фандінг з файлу Hyperliquid'
    );
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
