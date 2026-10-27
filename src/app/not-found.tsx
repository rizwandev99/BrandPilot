import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-muted mb-4">
        404 — Page Not Found
      </div>
      <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
        This page could not be located.
      </h1>
      <p className="mt-3 max-w-md text-sm text-text-muted">
        The route you are trying to view does not exist or has moved. Return to the dashboard to continue orchestrating marketing campaigns.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link
          href="/"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
        >
          Return to Dashboard
        </Link>
      </div>
    </main>
  );
}
