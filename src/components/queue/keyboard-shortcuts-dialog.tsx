'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Command, CornerDownLeft } from 'lucide-react';

export interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutRow {
  key: string;
  description: string;
  badge?: string;
}

const SHORTCUTS: ShortcutRow[] = [
  { key: '↑ or K', description: 'Navigate to previous post in queue' },
  { key: '↓ or J', description: 'Navigate to next post in queue' },
  { key: 'A', description: 'Approve selected post' },
  { key: 'H', description: 'Hold selected post (with optional reason)' },
  { key: 'E', description: 'Edit selected post caption & creative' },
  { key: '?', description: 'Open this keyboard shortcuts dialog' },
  { key: 'Esc', description: 'Close dialog or cancel edit' },
];

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          data-testid="keyboard-shortcuts-dialog"
          className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-lg border border-border bg-surface p-6 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-soft text-accent">
                <Command className="h-4 w-4" />
              </div>
              <Dialog.Title className="text-base font-semibold text-text">
                Keyboard Shortcuts
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description className="text-xs text-text-muted mt-2 mb-4">
            Navigate the approval queue efficiently without leaving your keyboard.
          </Dialog.Description>

          <div className="space-y-2">
            {SHORTCUTS.map((sc) => (
              <div
                key={sc.key}
                className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-surface-2 text-sm"
              >
                <span className="text-text-muted text-xs">{sc.description}</span>
                <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center px-1.5 text-xs font-mono font-medium text-text bg-surface-2 border border-border rounded shadow-sm">
                  {sc.key}
                </kbd>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-3 border-t border-border flex items-center justify-between text-[11px] text-text-faint">
            <span>Tip: Shortcuts are disabled when typing inside input fields</span>
            <kbd className="font-mono text-text-muted">Press ? anytime</kbd>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
