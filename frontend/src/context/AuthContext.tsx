import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (usernameOrEmail: string, pass: string) => Promise<void>;
  register: (email: string, username: string, pass: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(api.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = api.getToken();
      if (!savedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await api.getMe();
        setUser(me);
        setToken(savedToken);
      } catch {
        api.setToken(null);
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (usernameOrEmail: string, pass: string) => {
    const res = await api.login({ username_or_email: usernameOrEmail, password: pass });
    setUser(res.user);
    setToken(res.access_token);
  };

  const register = async (email: string, username: string, pass: string) => {
    const res = await api.register({ email, username, password: pass });
    setUser(res.user);
    setToken(res.access_token);
  };

  const loginDemo = async () => {
    await login('trader', 'password123');
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
