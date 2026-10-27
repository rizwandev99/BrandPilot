'use client';

import * as React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import {
  Bot,
  Lightbulb,
  Palette,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  ArrowRight,
  RotateCw,
  Sparkles,
  Info,
} from 'lucide-react';
import type { Channel } from '@/lib/channels';

interface StepInfo {
  name: 'idea' | 'creative' | 'campaign';
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepInfo[] = [
  {
    name: 'idea',
    label: 'Idea Agent',
    description: 'Brainstorm angles, hooks, and messaging targets',
    icon: Lightbulb,
  },
  {
    name: 'creative',
    label: 'Creative Agent',
    description: 'Draft multi-channel copy, hashtags, and branded card specs',
    icon: Palette,
  },
  {
    name: 'campaign',
    label: 'Campaign Agent',
    description: 'Calculate 7-day schedule intervals and create review drafts',
    icon: Send,
  },
];

interface StepRecord {
  id?: string;
  name: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  provider?: string;
  input?: unknown;
  output?: unknown;
  startedAt?: string;
  finishedAt?: string;
  error?: string | null;
}

interface RunData {
  id: string;
  workspaceId: string;
  brandKitId: string;
  goal: string;
  channels: string[];
  postCount: number;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  currentStep?: string | null;
  error?: string | null;
  createdAt: string;
  finishedAt?: string | null;
}

interface BrandKitSummary {
  id: string;
  name: string;
  summary: string;
}

export default function AgentPage() {
  const [brandKits, setBrandKits] = React.useState<BrandKitSummary[]>([]);
  const [selectedBrandKitId, setSelectedBrandKitId] = React.useState<string>('');
  const [goal, setGoal] = React.useState('Product launch & feature announcement');
  const [channels, setChannels] = React.useState<Channel[]>(['linkedin', 'x', 'instagram']);
  const [postCount, setPostCount] = React.useState(4);

  const [activeRun, setActiveRun] = React.useState<RunData | null>(null);
  const [stepsMap, setStepsMap] = React.useState<Record<string, StepRecord>>({});
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [generalError, setGeneralError] = React.useState<string | null>(null);
  const [hasFallbackNote, setHasFallbackNote] = React.useState(false);

  // Fetch available brand kits
  React.useEffect(() => {
    async function loadBrandKits() {
      try {
        const res = await fetch('/api/brand-kits');
        if (res.ok) {
          const data = await res.json();
          const kits: BrandKitSummary[] = data.brandKits || [];
          setBrandKits(kits);
          if (kits.length > 0 && kits[0]) {
            setSelectedBrandKitId(kits[0].id);
          }
        }
      } catch {
        // Fallback silently if offline or initial setup
      }
    }
    loadBrandKits();
  }, []);

  const handleChannelToggle = (ch: Channel) => {
    if (channels.includes(ch)) {
      if (channels.length > 1) {
        setChannels(channels.filter((c) => c !== ch));
      }
    } else {
      setChannels([...channels, ch]);
    }
  };

  const executePipeline = async (runId: string) => {
    setIsProcessing(true);
    setGeneralError(null);

    const stepNames: Array<'idea' | 'creative' | 'campaign'> = ['idea', 'creative', 'campaign'];

    for (const stepName of stepNames) {
      setStepsMap((prev) => ({
        ...prev,
        [stepName]: {
          name: stepName,
          status: 'running',
          startedAt: new Date().toISOString(),
        },
      }));

      try {
        const stepRes = await fetch(`/api/runs/${runId}/step`, {
          method: 'POST',
        });

        const stepData = await stepRes.json();

        if (!stepRes.ok || stepData.error) {
          const errMsg = stepData.error?.message || `Failed to execute ${stepName} step`;
          setStepsMap((prev) => ({
            ...prev,
            [stepName]: {
              name: stepName,
              status: 'failed',
              error: errMsg,
              finishedAt: new Date().toISOString(),
            },
          }));
          setActiveRun((prev) =>
            prev ? { ...prev, status: 'failed', currentStep: stepName, error: errMsg } : null
          );
          setGeneralError(errMsg);
          setIsProcessing(false);
          return;
        }

        const returnedStep = stepData.step;
        if (returnedStep?.provider === 'fallback') {
          setHasFallbackNote(true);
        }

        setStepsMap((prev) => ({
          ...prev,
          [stepName]: {
            ...returnedStep,
            status: 'succeeded',
            finishedAt: new Date().toISOString(),
          },
        }));

        if (stepData.run) {
          setActiveRun(stepData.run);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Network error executing step';
        setStepsMap((prev) => ({
          ...prev,
          [stepName]: {
            name: stepName,
            status: 'failed',
            error: errMsg,
            finishedAt: new Date().toISOString(),
          },
        }));
        setActiveRun((prev) => (prev ? { ...prev, status: 'failed', error: errMsg } : null));
        setGeneralError(errMsg);
        setIsProcessing(false);
        return;
      }
    }

    setIsProcessing(false);
  };

  const handleStartRun = async () => {
    setGeneralError(null);
    setHasFallbackNote(false);
    setStepsMap({});

    let brandKitId = selectedBrandKitId;
    if (!brandKitId) {
      // Create a default sample brand kit if none exists
      try {
        const res = await fetch('/api/brand-kits', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sample: true }),
        });
        if (res.ok) {
          const newKit = await res.json();
          brandKitId = newKit.id;
          setSelectedBrandKitId(newKit.id);
          setBrandKits([newKit]);
        }
      } catch {
        setGeneralError('Please configure a Brand Kit before running the agent.');
        return;
      }
    }

    try {
      setIsProcessing(true);
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          brandKitId,
          goal,
          channels,
          postCount,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error?.message || 'Failed to initialize agent run');
      }

      const run = await res.json();
      setActiveRun(run);

      // Begin 3-step execution
      await executePipeline(run.id);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setGeneralError(errMsg);
      setIsProcessing(false);
    }
  };

  const handleRetryStep = async () => {
    if (!activeRun) return;
    setIsProcessing(true);
    setGeneralError(null);

    try {
      const res = await fetch(`/api/runs/${activeRun.id}/retry`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error?.message || 'Retry failed');
      }

      const step = data.step;
      if (step) {
        setStepsMap((prev) => ({
          ...prev,
          [step.name]: step,
        }));
      }

      if (data.run) {
        setActiveRun(data.run);
      }

      // Resume pipeline if there are subsequent steps
      if (data.run?.status !== 'succeeded') {
        await executePipeline(activeRun.id);
      } else {
        setIsProcessing(false);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setGeneralError(errMsg);
      setIsProcessing(false);
    }
  };

  return (
    <AppShell
      title="Content Agent Pipeline"
      breadcrumbs={[{ label: 'Agent', href: '/agent' }]}
      currentPath="/agent"
    >
      <div className="max-w-5xl mx-auto space-y-8 pb-16">
        {/* Header banner */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Content Agent Pipeline</h1>
              <p className="text-sm text-muted-foreground">
                3-step state machine: generates on-brand ideas, multi-channel copy, and branded graphic cards.
              </p>
            </div>
          </div>
        </div>

        {/* Offline Fallback Note Banner (AC-F3-08) */}
        {hasFallbackNote && (
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Notice: Offline Writer Engaged</p>
              <p>Written with the offline writer because the AI quota is used up.</p>
            </div>
          </div>
        )}

        {/* Configuration Card */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-6">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Campaign Parameters
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Goal Input */}
            <div className="space-y-2">
              <label htmlFor="goal" className="text-sm font-medium text-foreground">
                Campaign Goal & Focus
              </label>
              <input
                id="goal"
                type="text"
                value={goal}
                disabled={isProcessing}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Announce 2.0 release with 50% faster indexing"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
              />
            </div>

            {/* Brand Kit Selection */}
            <div className="space-y-2">
              <label htmlFor="brandKit" className="text-sm font-medium text-foreground">
                Target Brand Kit
              </label>
              {brandKits.length > 0 ? (
                <select
                  id="brandKit"
                  value={selectedBrandKitId}
                  disabled={isProcessing}
                  onChange={(e) => setSelectedBrandKitId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                >
                  {brandKits.map((bk) => (
                    <option key={bk.id} value={bk.id}>
                      {bk.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-xs text-muted-foreground p-2.5 border border-dashed border-border rounded-lg">
                  Using default built-in Brand Kit (auto-initialized).
                </div>
              )}
            </div>
          </div>

          {/* Channels & Post Count */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground block">Target Channels</span>
              <div className="flex flex-wrap gap-2">
                {(['linkedin', 'x', 'instagram', 'facebook'] as Channel[]).map((ch) => {
                  const isSelected = channels.includes(ch);
                  return (
                    <button
                      key={ch}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleChannelToggle(ch)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted'
                      } disabled:opacity-50`}
                    >
                      {ch.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="postCount" className="text-sm font-medium text-foreground">
                Number of Posts
              </label>
              <div className="flex items-center gap-3">
                {[2, 4, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setPostCount(num)}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      postCount === num
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    } disabled:opacity-50`}
                  >
                    {num} Posts
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-border">
            <div className="text-xs text-muted-foreground">
              Guaranteed channel limits &amp; brand kit donts compliance
            </div>
            <button
              type="button"
              disabled={isProcessing || !goal.trim()}
              onClick={handleStartRun}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow hover:opacity-95 transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4" />
                  Run Content Agent
                </>
              )}
            </button>
          </div>
        </div>

        {/* General Error Banner */}
        {generalError && (
          <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{generalError}</span>
            </div>
            {activeRun?.status === 'failed' && (
              <button
                type="button"
                onClick={handleRetryStep}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold hover:opacity-90 transition-all"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Retry step
              </button>
            )}
          </div>
        )}

        {/* Stepper Pipeline Visualizer (AC-F3-11) */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">3-Step Execution Pipeline</h2>
            {activeRun && (
              <span
                className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                  activeRun.status === 'succeeded'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : activeRun.status === 'failed'
                    ? 'bg-destructive/10 text-destructive border border-destructive/20'
                    : 'bg-primary/10 text-primary border border-primary/20'
                }`}
              >
                {activeRun.status}
              </span>
            )}
          </div>

          <div className="relative pl-6 border-l-2 border-border/80 space-y-8">
            {STEPS.map((step, idx) => {
              const record = stepsMap[step.name];
              const status = record?.status || 'pending';
              const StepIcon = step.icon;

              return (
                <div key={step.name} className="relative group">
                  {/* Status node */}
                  <div
                    className={`absolute -left-[31px] top-1 w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                      status === 'succeeded'
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : status === 'running'
                        ? 'bg-primary border-primary text-primary-foreground animate-pulse'
                        : status === 'failed'
                        ? 'bg-destructive border-destructive text-destructive-foreground'
                        : 'bg-card border-border text-muted-foreground'
                    }`}
                  >
                    {status === 'succeeded' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : status === 'running' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : status === 'failed' ? (
                      <AlertCircle className="w-3.5 h-3.5" />
                    ) : (
                      <span className="text-[10px] font-bold">{idx + 1}</span>
                    )}
                  </div>

                  {/* Step content */}
                  <div className="p-4 rounded-xl border border-border/60 bg-background/50 hover:bg-background transition-all space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StepIcon className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm text-foreground">{step.label}</span>
                      </div>
                      {record?.provider && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                          {record.provider}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">{step.description}</p>

                    {/* Step output summary */}
                    {status === 'succeeded' && record?.output != null ? (
                      <div className="mt-3 p-3 rounded-lg bg-muted/40 border border-border text-xs font-mono overflow-x-auto max-h-36">
                        <pre className="text-muted-foreground">
                          {JSON.stringify(record.output, null, 2)}
                        </pre>
                      </div>
                    ) : null}

                    {status === 'failed' && record?.error && (
                      <div className="mt-2 text-xs text-destructive">
                        Error: {record.error}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Success actions */}
          {activeRun?.status === 'succeeded' && (
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                Pipeline complete! Posts drafted in approval queue.
              </div>
              <Link
                href="/queue"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow hover:opacity-95 transition-all"
              >
                <span>View posts in queue</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
