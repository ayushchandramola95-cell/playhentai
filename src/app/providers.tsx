'use client';

import { ThemeProvider } from 'next-themes';
import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';

// Suppress the React 19 / Next.js 16+ console warning for inline script tag injections from next-themes FOUC check
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const orig = console.error;
  console.error = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Encountered a script tag')) {
      return;
    }
    orig.apply(console, args);
  };
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
}
