import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/app-shell';
import { CalendarGrid } from '@/components/calendar/calendar-grid';

export const metadata: Metadata = {
  title: 'Content Calendar — BrandPilot',
  description:
    'Visual calendar grid showing scheduled, approved, and published social media posts.',
};

export default function CalendarPage() {
  return (
    <AppShell
      title="Content Calendar"
      currentPath="/calendar"
      breadcrumbs={[
        { label: 'BrandPilot', href: '/' },
        { label: 'Calendar', href: '/calendar' },
      ]}
    >
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text">
            Content Calendar
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Month overview of scheduled, approved, and published posts across all connected channels.
          </p>
        </div>

        <CalendarGrid />
      </div>
    </AppShell>
  );
}
