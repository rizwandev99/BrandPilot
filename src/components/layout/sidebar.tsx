'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Home,
  Sparkles,
  Bot,
  Layers,
  Calendar,
  Cable,
  Zap,
  Webhook,
  Activity,
  RotateCcw,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
} from 'lucide-react';
import { clsx } from 'clsx';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Brand Kit', href: '/brand-kit', icon: Sparkles },
  { label: 'Agent', href: '/agent', icon: Bot },
  { label: 'Queue', href: '/queue', icon: Layers },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'Connectors', href: '/connectors', icon: Cable },
  { label: 'Automations', href: '/automations', icon: Zap },
  { label: 'Webhooks', href: '/webhooks', icon: Webhook },
  { label: 'Activity', href: '/activity', icon: Activity },
];

export function ThemeToggle({ className }: { className?: string }) {
  const [mounted, setMounted] = React.useState(false);
  const { setTheme, resolvedTheme } = useTheme();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === 'dark' : false;

  const toggle = () => {
    if (setTheme) {
      setTheme(isDark ? 'light' : 'dark');
    }
  };

  return (
    <button
      type="button"
      data-testid="theme-toggle"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      onClick={toggle}
      className={clsx(
        'inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:text-text hover:bg-surface-2 transition-colors',
        className
      )}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}

export interface SidebarProps {
  className?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  currentPath?: string;
  onNavigate?: (href: string) => void;
  onResetDemo?: () => void;
}

export function Sidebar({
  className,
  collapsed = false,
  onToggleCollapse,
  currentPath,
  onNavigate,
  onResetDemo,
}: SidebarProps) {
  const pathname = usePathname();
  const activePath = currentPath ?? (pathname || '/');

  const handleResetDemo = async () => {
    if (onResetDemo) {
      onResetDemo();
      return;
    }
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'Reset workspace data? This restores a fresh isolated workspace state.'
      );
      if (confirmed) {
        try {
          await fetch('/api/workspace/reset', { method: 'POST' });
          window.location.href = '/';
        } catch (err) {
          console.error('Failed to reset workspace:', err);
        }
      }
    }
  };

  return (
    <div
      data-testid="sidebar-container"
      className={clsx(
        'flex flex-col h-full bg-surface text-text select-none',
        collapsed ? 'w-16' : 'w-60',
        className
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border h-14 shrink-0">
        <Link
          href="/"
          onClick={() => onNavigate?.('/')}
          className="flex items-center gap-2.5 overflow-hidden font-semibold text-text text-sm tracking-tight"
          data-testid="brand-logo"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-on-accent font-bold text-xs shadow-sm">
            BP
          </div>
          {!collapsed && (
            <span className="truncate font-medium text-text">BrandPilot</span>
          )}
        </Link>
        {onToggleCollapse && (
          <button
            type="button"
            data-testid="sidebar-collapse-toggle"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:flex h-6 w-6 items-center justify-center rounded text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-3.5 w-3.5" />
            ) : (
              <PanelLeftClose className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Main Navigation Links */}
      <nav
        aria-label="Sidebar navigation"
        className="flex-1 overflow-y-auto px-2 py-3 space-y-1"
        data-testid="sidebar-nav"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            activePath === item.href ||
            (item.href !== '/' && activePath.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onNavigate?.(item.href)}
              data-testid={`nav-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              data-active={isActive ? 'true' : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={clsx(
                'group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-accent-soft text-accent font-semibold'
                  : 'text-text-muted hover:text-text hover:bg-surface-2',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={clsx(
                  'h-4 w-4 shrink-0',
                  isActive
                    ? 'text-accent'
                    : 'text-text-muted group-hover:text-text'
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-surface-2 text-text-muted font-normal">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Controls: Theme Toggle & Reset Demo */}
      <div className="p-2 border-t border-border space-y-1 shrink-0">
        <div
          className={clsx(
            'flex items-center',
            collapsed ? 'justify-center py-1' : 'justify-between px-2.5 py-1'
          )}
        >
          {!collapsed && <span className="text-xs text-text-muted">Theme</span>}
          <ThemeToggle />
        </div>
        <button
          type="button"
          data-testid="reset-demo-button"
          onClick={handleResetDemo}
          className={clsx(
            'flex items-center gap-2.5 w-full rounded-md px-2.5 py-2 text-xs font-medium text-text-muted hover:text-danger hover:bg-surface-2 transition-colors',
            collapsed && 'justify-center px-0'
          )}
          title="Reset isolated workspace"
        >
          <RotateCcw className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Reset Workspace</span>}
        </button>
      </div>
    </div>
  );
}
