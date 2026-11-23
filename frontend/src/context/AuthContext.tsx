import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, LoginResult, OtpSendResponse } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (usernameOrEmail: string, pass: string) => Promise<LoginResult>;
  verifyLoginOtp: (tempToken: string, otpCode: string) => Promise<void>;
  sendRegisterOtp: (email: string, username: string, pass: string) => Promise<OtpSendResponse>;
  registerWithOtp: (email: string, username: string, pass: string, otpCode: string) => Promise<void>;
  resendOtp: (data: { email?: string; tempToken?: string; purpose?: 'registration' | 'login' }) => Promise<OtpSendResponse>;
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

  const login = async (usernameOrEmail: string, pass: string): Promise<LoginResult> => {
    const res = await api.login({ username_or_email: usernameOrEmail, password: pass });
    if ('access_token' in res) {
      setUser(res.user);
      setToken(res.access_token);
    }
    return res;
  };

  const verifyLoginOtp = async (tempToken: string, otpCode: string): Promise<void> => {
    const res = await api.verifyLoginOtp({ temp_token: tempToken, otp_code: otpCode });
    setUser(res.user);
    setToken(res.access_token);
  };

  const sendRegisterOtp = async (email: string, username: string, pass: string): Promise<OtpSendResponse> => {
    return api.sendRegisterOtp({ email, username, password: pass });
  };

  const registerWithOtp = async (email: string, username: string, pass: string, otpCode: string): Promise<void> => {
    const res = await api.register({ email, username, password: pass, otp_code: otpCode });
    setUser(res.user);
    setToken(res.access_token);
  };

  const resendOtp = async (data: { email?: string; tempToken?: string; purpose?: 'registration' | 'login' }): Promise<OtpSendResponse> => {
    return api.resendOtp({ email: data.email, temp_token: data.tempToken, purpose: data.purpose });
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
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        verifyLoginOtp,
        sendRegisterOtp,
        registerWithOtp,
        resendOtp,
        loginDemo,
        logout,
      }}
    >
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
