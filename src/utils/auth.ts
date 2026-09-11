// Simple auth utilities (in production, use proper backend)
const TOKEN_KEY = 'admin_auth_token';
const USER_KEY = 'admin_user';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

// Hash function for passwords (simple demo - use bcrypt in production)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'admin_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashed = await hashPassword(password);
  return hashed === hash;
}

export function generateToken(): string {
  return crypto.randomUUID() + '_' + Date.now().toString(36);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getUser(): User | null {
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
}

export function setUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  // Check stored admin credentials
  const storedHash = localStorage.getItem('admin_password_hash');
  
  if (!storedHash) {
    // First login - create admin account
    const hash = await hashPassword(password);
    localStorage.setItem('admin_password_hash', hash);
    localStorage.setItem('admin_username', username);
    
    const token = generateToken();
    const user: User = {
      id: crypto.randomUUID(),
      username,
      email: `${username}@admin.local`,
      role: 'admin',
      createdAt: new Date().toISOString(),
    };
    
    setToken(token);
    setUser(user);
    
    return { success: true, token, user };
  }
  
  // Verify credentials
  const storedUsername = localStorage.getItem('admin_username');
  if (username !== storedUsername) {
    return { success: false, error: 'Неверное имя пользователя или пароль' };
  }
  
  const valid = await verifyPassword(password, storedHash);
  if (!valid) {
    return { success: false, error: 'Неверное имя пользователя или пароль' };
  }
  
  const token = generateToken();
  const user: User = {
    id: crypto.randomUUID(),
    username,
    email: `${username}@admin.local`,
    role: 'admin',
    createdAt: new Date().toISOString(),
  };
  
  setToken(token);
  setUser(user);
  
  return { success: true, token, user };
}

export function logout(): void {
  removeToken();
}
