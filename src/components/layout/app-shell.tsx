'use client';

import * as React from 'react';
import { clsx } from 'clsx';
import { Sidebar } from './sidebar';
import { TopBar, BreadcrumbItem } from './top-bar';

export interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  currentPath?: string;
  onResetDemo?: () => void;
  initialCollapsed?: boolean;
  className?: string;
}

export function AppShell({
  children,
  title,
  breadcrumbs,
  actions,
  currentPath,
  onResetDemo,
  initialCollapsed = false,
  className,
}: AppShellProps) {
  const [collapsed, setCollapsed] = React.useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Close mobile navigation on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  // Prevent background scroll when mobile navigation is open
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      if (mobileOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [mobileOpen]);

  return (
    <div
      data-testid="app-shell"
      className={clsx('min-h-screen flex bg-bg text-text', className)}
    >
      {/* Desktop Sidebar (visible on md screens and wider) */}
      <aside
        data-testid="desktop-sidebar"
        className={clsx(
          'hidden md:flex flex-col border-r border-border bg-surface shrink-0 transition-all duration-200 z-20 sticky top-0 h-screen',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          currentPath={currentPath}
          onResetDemo={onResetDemo}
        />
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          data-testid="mobile-drawer-backdrop"
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar Drawer (collapsible on phone widths) */}
      <aside
        data-testid="mobile-sidebar"
        aria-modal="true"
        role="dialog"
        aria-label="Mobile navigation"
        className={clsx(
          'md:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[80vw] bg-surface border-r border-border shadow-xl transform transition-transform duration-200 ease-in-out flex flex-col',
          mobileOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        )}
      >
        <Sidebar
          collapsed={false}
          currentPath={currentPath}
          onNavigate={() => setMobileOpen(false)}
          onResetDemo={() => {
            setMobileOpen(false);
            onResetDemo?.();
          }}
        />
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          title={title}
          breadcrumbs={breadcrumbs}
          actions={actions}
          isMobileOpen={mobileOpen}
          onToggleMobile={() => setMobileOpen(!mobileOpen)}
        />
        <main
          data-testid="app-content-area"
          className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8"
        >
          <div className="max-w-[1200px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export { Sidebar, ThemeToggle, NAV_ITEMS } from './sidebar';
export { TopBar } from './top-bar';
export type { NavItem, SidebarProps } from './sidebar';
export type { BreadcrumbItem, TopBarProps } from './top-bar';
