const API_BASE = '/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('auth_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    } catch (error) {
      throw new Error('Сервер недоступен. Убедитесь что бэкенд запущен (node server/index.js)');
    }

    if (response.status === 401 || response.status === 403) {
      this.setToken(null);
      localStorage.removeItem('auth_token');
      // Небольшая задержка перед перезагрузкой
      setTimeout(() => {
        window.location.reload();
      }, 100);
      throw new Error('Сессия истекла, войдите снова');
    }

    // Проверяем что ответ - JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Сервер вернул не-JSON ответ. Проверьте что бэкенд запущен.');
    }

    let data: any;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error('Ошибка парсинга ответа сервера');
    }

    if (!response.ok) {
      throw new Error(data.error || `Ошибка ${response.status}`);
    }

    return data;
  }

  // Auth
  async checkAuth() {
    return this.request<{ success: boolean; needsRegistration: boolean }>('/auth/check');
  }

  async register(username: string, password: string, email?: string) {
    const data = await this.request<{ success: boolean; token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, email }),
    });
    if (data.token) this.setToken(data.token);
    return data;
  }

  async login(username: string, password: string) {
    const data = await this.request<{ success: boolean; token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data.token) this.setToken(data.token);
    return data;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  async getMe() {
    return this.request<{ success: boolean; user: any }>('/auth/me');
  }

  // Passwords
  async getPasswords(params?: { category?: string; type?: string; search?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<{ success: boolean; passwords: any[] }>(`/passwords${query ? '?' + query : ''}`);
  }

  async createPassword(data: any) {
    return this.request('/passwords', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePassword(id: string, data: any) {
    return this.request(`/passwords/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePassword(id: string) {
    return this.request(`/passwords/${id}`, { method: 'DELETE' });
  }

  async generatePassword(options?: any) {
    return this.request<{ success: boolean; password: string }>('/passwords/generate', {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
  }

  async generateAPIKey() {
    return this.request<{ success: boolean; apiKey: string }>('/passwords/generate-api-key', {
      method: 'POST',
    });
  }

  // Media
  async getMediaTasks() {
    return this.request<{ success: boolean; tasks: any[] }>('/media/tasks');
  }

  async startDownload(url: string, mediaType?: string, quality?: string) {
    return this.request<{ success: boolean; taskId: string; platform: string }>('/media/download', {
      method: 'POST',
      body: JSON.stringify({ url, mediaType, quality }),
    });
  }

  async getTaskStatus(taskId: string) {
    return this.request<{ success: boolean; task: any }>(`/media/tasks/${taskId}`);
  }

  async deleteMediaTask(taskId: string) {
    return this.request(`/media/tasks/${taskId}`, { method: 'DELETE' });
  }

  // Cron
  async getCronTasks() {
    return this.request<{ success: boolean; tasks: any[] }>('/cron/tasks');
  }

  async createCronTask(data: any) {
    return this.request('/cron/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCronTask(id: string, data: any) {
    return this.request(`/cron/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async toggleCronTask(id: string) {
    return this.request(`/cron/tasks/${id}/toggle`, { method: 'POST' });
  }

  async runCronTask(id: string) {
    return this.request(`/cron/tasks/${id}/run`, { method: 'POST' });
  }

  async deleteCronTask(id: string) {
    return this.request(`/cron/tasks/${id}`, { method: 'DELETE' });
  }

  async getCronLogs(id: string) {
    return this.request<{ success: boolean; logs: any[] }>(`/cron/tasks/${id}/logs`);
  }

  // Storage
  async getFiles(folderPath?: string, search?: string) {
    const params = new URLSearchParams();
    if (folderPath) params.set('folderPath', folderPath);
    if (search) params.set('search', search);
    return this.request<{ success: boolean; files: any[]; totalSize: number }>(`/storage/files?${params}`);
  }

  async uploadFiles(files: File[], folderPath: string = '/'): Promise<{ success: boolean; files?: any[]; error?: string; message?: string }> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('folderPath', folderPath);

    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}/storage/upload`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    return response.json();
  }

  async createFolder(name: string, parentPath: string = '/'): Promise<{ success: boolean; folder?: any; error?: string }> {
    return this.request('/storage/folder', {
      method: 'POST',
      body: JSON.stringify({ name, parentPath }),
    });
  }

  async deleteFile(id: string) {
    return this.request(`/storage/files/${id}`, { method: 'DELETE' });
  }

  async getStorageStats() {
    return this.request<{ success: boolean; stats: any }>('/storage/stats');
  }

  getDownloadUrl(fileId: string) {
    return `${API_BASE}/storage/download/${fileId}`;
  }

  getMediaDownloadUrl(taskId: string) {
    return `${API_BASE}/media/download-file/${taskId}`;
  }
}

export const api = new ApiClient();
export default api;
