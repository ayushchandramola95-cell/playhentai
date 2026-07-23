'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  username: string | null;
  role: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const response = await fetch('/api/auth/session', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setProfile(data.profile);
      }
    } catch (err) {
      console.error('Error fetching session details:', err);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      await fetchSession();
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const refresh = async () => {
    await fetchSession();
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      
      if (!response.ok || data.error) {
        return { error: data.error || 'Login failed' };
      }

      await fetchSession();
      return { error: null };
    } catch (err: any) {
      console.error('Sign-in context error:', err);
      return { error: err.message || 'Network error signing in' };
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        return { error: data.error || 'Signup failed' };
      }

      await fetchSession();
      return { error: null };
    } catch (err: any) {
      console.error('Sign-up context error:', err);
      return { error: err.message || 'Network error signing up' };
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } catch (err) {
      console.error('Sign-out context error:', err);
    } finally {
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, signIn, signUp, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
