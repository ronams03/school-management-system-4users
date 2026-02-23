import React, { createContext, useEffect, useMemo, useState } from 'react';
import API from '../api/axios';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  const persistSession = (nextToken, nextUser, nextProfile = null) => {
    setToken(nextToken);
    setUser(nextUser);
    setProfile(nextProfile);
    localStorage.setItem('token', nextToken);
    localStorage.setItem('user', JSON.stringify(nextUser));
  };

  const clearSession = () => {
    setToken('');
    setUser(null);
    setProfile(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const login = async (email, password) => {
    const { data } = await API.post('/auth/login', { email, password });
    const payload = data?.data || {};
    persistSession(payload.token, payload.user, payload.profile || null);
    return payload;
  };

  const loginWithEyeScan = async (scanData) => {
    const { data } = await API.post('/auth/login/eyescan', { scanData });
    const payload = data?.data || {};
    persistSession(payload.token, payload.user, payload.profile || null);
    return payload;
  };

  const logout = () => {
    clearSession();
  };

  useEffect(() => {
    const restoreSession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await API.get('/auth/me');
        const payload = data?.data || {};
        if (payload.user) {
          setUser(payload.user);
          setProfile(payload.profile || null);
          localStorage.setItem('user', JSON.stringify(payload.user));
        }
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      user,
      profile,
      loading,
      isAuthenticated: Boolean(token),
      login,
      loginWithEyeScan,
      logout,
    }),
    [token, user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
