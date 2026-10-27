'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu, X, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface TopBarProps {
  title?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  onToggleMobile?: () => void;
  isMobileOpen?: boolean;
  className?: string;
}

export function TopBar({
  title,
  breadcrumbs,
  actions,
  onToggleMobile,
  isMobileOpen = false,
  className,
}: TopBarProps) {
  return (
    <header
      data-testid="top-bar"
      className={clsx(
        'sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface px-4 md:px-6 shrink-0',
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {onToggleMobile && (
          <button
            type="button"
            data-testid="mobile-menu-toggle"
            aria-label={isMobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileOpen}
            onClick={onToggleMobile}
            className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-muted hover:text-text hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent transition-colors"
          >
            {isMobileOpen ? (
              <X className="h-4 w-4" data-testid="mobile-menu-close-icon" />
            ) : (
              <Menu className="h-4 w-4" data-testid="mobile-menu-open-icon" />
            )}
          </button>
        )}

        {/* Breadcrumb Hierarchy or Main Title */}
        <div className="flex items-center gap-1.5 truncate">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <nav aria-label="Breadcrumb" className="flex items-center text-xs">
              <ol className="flex items-center gap-1.5 list-none p-0 m-0">
                {breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <li key={idx} className="flex items-center gap-1.5">
                      {idx > 0 && (
                        <ChevronRight className="h-3 w-3 text-text-muted shrink-0" />
                      )}
                      {crumb.href && !isLast ? (
                        <Link
                          href={crumb.href}
                          className="text-text-muted hover:text-text transition-colors"
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span
                          className={clsx(
                            'truncate font-medium',
                            isLast ? 'text-text font-semibold' : 'text-text-muted'
                          )}
                          aria-current={isLast ? 'page' : undefined}
                        >
                          {crumb.label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          ) : title ? (
            <h1 className="text-sm font-semibold text-text truncate">{title}</h1>
          ) : (
            <span className="text-sm font-semibold text-text">BrandPilot</span>
          )}
        </div>
      </div>

      {/* Right-aligned Primary Actions */}
      {actions && (
        <div
          data-testid="top-bar-actions"
          className="flex items-center gap-2 shrink-0"
        >
          {actions}
        </div>
      )}
    </header>
  );
}
