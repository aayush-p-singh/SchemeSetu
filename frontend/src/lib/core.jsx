import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:5000/api';

export const REGEX = {
  nationalId: /^\d{12}$/,
  phone: /^[6-9]\d{9}$/,
  payoutAccount: /^\d{9,18}$/,
  ifscCode: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  uanNumber: /^\d{12}$/,
};

export function sanitizeField(name, rawValue) {
  const val = String(rawValue ?? '');
  switch (name) {
    case 'nationalId':
    case 'uanNumber':
      return val.replace(/\D/g, '').slice(0, 12);
    case 'phone':
      return val.replace(/\D/g, '').slice(0, 10);
    case 'payoutAccount':
      return val.replace(/\D/g, '').slice(0, 18);
    case 'ifscCode':
      return val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
    default:
      return val;
  }
}

export function validateVaultFields(data, { requireAuthFields = false } = {}) {
  const errors = {};
  if (requireAuthFields) {
    if (!data.name || data.name.trim().length < 2) errors.name = 'Enter full name (min 2 chars)';
    if (!REGEX.phone.test(data.phone || '')) errors.phone = '10-digit mobile starting with 6–9 required';
    if (!data.password || data.password.length < 6) errors.password = 'Password must be at least 6 characters';
  } else if (data.phone && !REGEX.phone.test(data.phone)) {
    errors.phone = '10-digit mobile starting with 6–9 required';
  }

  if (data.nationalId && !REGEX.nationalId.test(data.nationalId)) {
    errors.nationalId = 'National ID must be strictly 12 numeric digits';
  }
  if (data.payoutAccount && !REGEX.payoutAccount.test(data.payoutAccount)) {
    errors.payoutAccount = 'Account number must be 9 to 18 numeric digits';
  }
  if (data.ifscCode && !REGEX.ifscCode.test(data.ifscCode)) {
    errors.ifscCode = 'IFSC must be 11 chars (e.g., SBIN0001234)';
  }
  if (data.uanNumber && !REGEX.uanNumber.test(data.uanNumber)) {
    errors.uanNumber = 'UAN must be strictly 12 numeric digits';
  }
  return errors;
}

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('schemesetu_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && !path.startsWith('/auth/login')) {
    localStorage.removeItem('schemesetu_token');
    localStorage.removeItem('schemesetu_user');
    if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
      window.location.href = '/login';
    }
  }

  if (!res.ok) {
    let detailMsg = '';
    if (Array.isArray(data?.errors) && data.errors[0]) {
      detailMsg = data.errors[0].message || String(data.errors[0]);
    } else if (Array.isArray(data?.details) && data.details[0]) {
      detailMsg = data.details[0].message || String(data.details[0]);
    } else if (Array.isArray(data?.issues) && data.issues[0]) {
      detailMsg = `${data.issues[0].path?.join('.') || 'Field'}: ${data.issues[0].message}`;
    } else if (data?.fieldErrors && typeof data.fieldErrors === 'object') {
      const firstKey = Object.keys(data.fieldErrors)[0];
      if (firstKey) detailMsg = `${firstKey}: ${data.fieldErrors[firstKey]}`;
    } else if (data?.details && typeof data.details === 'object') {
      const firstKey = Object.keys(data.details)[0];
      if (firstKey) detailMsg = `${firstKey}: ${JSON.stringify(data.details[firstKey])}`;
    }
    throw new Error(detailMsg || data?.message || data?.error || `Request failed (${res.status})`);
  }

  return data;
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('schemesetu_token') || '');
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('schemesetu_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('schemesetu_token')));
  const [chatOpen, setChatOpen] = useState(false);
  const [queuedPrompt, setQueuedPrompt] = useState('');

  const persistSession = useCallback((newToken, newUser) => {
    localStorage.setItem('schemesetu_token', newToken);
    localStorage.setItem('schemesetu_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('schemesetu_token');
    localStorage.removeItem('schemesetu_user');
    setToken('');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem('schemesetu_token')) {
      setLoading(false);
      return null;
    }
    try {
      const res = await apiRequest('/auth/me');
      const u = res.user || res;
      localStorage.setItem('schemesetu_user', JSON.stringify(u));
      setUser(u);
      return u;
    } catch {
      logout();
      return null;
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (phone, password) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
    persistSession(res.token, res.user);
    return res.user;
  };

  const register = async (role, payload) => {
    const endpoint = role === 'contractor' ? '/auth/register/contractor' : '/auth/register/laborer';
    const res = await apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    persistSession(res.token, res.user);
    return res.user;
  };

  const askSchemeMitra = useCallback((promptText) => {
    setQueuedPrompt(promptText);
    setChatOpen(true);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshUser,
        chatOpen,
        setChatOpen,
        queuedPrompt,
        setQueuedPrompt,
        askSchemeMitra,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}