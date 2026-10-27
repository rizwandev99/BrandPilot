import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/app-shell';
import { QueueTable } from '@/components/queue/queue-table';

export const metadata: Metadata = {
  title: 'Approval Queue — BrandPilot',
  description:
    'Human-in-the-loop review and approval queue for multi-channel posts and branded cards.',
};

export default function QueuePage() {
  return (
    <AppShell
      title="Approval Queue"
      currentPath="/queue"
      breadcrumbs={[
        { label: 'BrandPilot', href: '/' },
        { label: 'Queue', href: '/queue' },
      ]}
    >
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text">
            Approval Queue
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Review, edit, hold, and approve AI-generated social media posts before publishing.
          </p>
        </div>

        <QueueTable />
      </div>
    </AppShell>
  );
}
