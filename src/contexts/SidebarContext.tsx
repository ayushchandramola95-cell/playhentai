'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface SidebarContextType {
  isExpanded: boolean;
  toggleSidebar: () => void;
  setIsExpanded: (expanded: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  isExpanded: false,
  toggleSidebar: () => {},
  setIsExpanded: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('playhentai_sidebar_expanded');
      if (saved !== null) {
        setIsExpanded(saved === 'true');
      }
    } catch (e) {
      // localStorage may fail in restricted environments
    }
  }, []);

  const toggleSidebar = () => {
    setIsExpanded(prev => {
      const next = !prev;
      try {
        localStorage.setItem('playhentai_sidebar_expanded', String(next));
      } catch (e) {}
      return next;
    });
  };

  return (
    <SidebarContext.Provider value={{ isExpanded, toggleSidebar, setIsExpanded }}>
      {children}
    </SidebarContext.Provider>
  );
}
