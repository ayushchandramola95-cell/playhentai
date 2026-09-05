import React from 'react';
import { SidebarProvider } from '@/contexts/SidebarContext';
import LayoutContent from './LayoutContent';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <LayoutContent>
        {children}
      </LayoutContent>
    </SidebarProvider>
  );
}


