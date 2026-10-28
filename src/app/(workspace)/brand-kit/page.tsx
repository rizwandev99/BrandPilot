'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import {
  Sparkles,
  Palette,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Edit2,
  Save,
  X,
  Bot,
  Loader2,
  RefreshCw,
  Plus,
  Tag,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import type { BrandKit } from '@/lib/validation/brand-kit';

export default function BrandKitPage() {
  const router = useRouter();
  const [brandKits, setBrandKits] = React.useState<BrandKit[]>([]);
  const [selectedKitId, setSelectedKitId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // URL extraction state
  const [extractUrl, setExtractUrl] = React.useState('');
  const [extracting, setExtracting] = React.useState(false);
  const [showAddDialog, setShowAddDialog] = React.useState(false);

  // Edit state
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState('');
  const [editSummary, setEditSummary] = React.useState('');
  const [editAudience, setEditAudience] = React.useState('');
  const [editTone, setEditTone] = React.useState<string[]>([]);
  const [editDos, setEditDos] = React.useState<string[]>([]);
  const [editDonts, setEditDonts] = React.useState<string[]>([]);
  const [editKeywords, setEditKeywords] = React.useState<string[]>([]);
  const [editPrimary, setEditPrimary] = React.useState('');
  const [editSecondary, setEditSecondary] = React.useState('');

  const loadBrandKits = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/brand-kits');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const kits: BrandKit[] = Array.isArray(data) ? data : data.brandKits || [];
      setBrandKits(kits);
      if (kits.length > 0) {
        const urlId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') : null;
        setSelectedKitId((prev) => {
          if (urlId && kits.some((k) => k.id === urlId)) return urlId;
          if (prev && kits.some((k) => k.id === prev)) return prev;
          return kits[0].id || null;
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load brand kits');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadBrandKits();
  }, [loadBrandKits]);

  const activeKit = React.useMemo(() => {
    if (!brandKits.length) return null;
    return brandKits.find((k) => k.id === selectedKitId) || brandKits[0];
  }, [brandKits, selectedKitId]);

  // Sync edit fields when entering edit mode or active kit changes
  React.useEffect(() => {
    if (activeKit) {
      setEditName(activeKit.name || '');
      setEditSummary(activeKit.summary || '');
      setEditAudience(activeKit.audience || '');
      setEditTone(activeKit.tone || []);
      setEditDos(activeKit.dos || []);
      setEditDonts(activeKit.donts || []);
      setEditKeywords(activeKit.keywords || []);
      setEditPrimary(activeKit.colors?.primary || '#2563eb');
      setEditSecondary(activeKit.colors?.secondary || '#10b981');
    }
  }, [activeKit]);

  const handleSave = async () => {
    if (!activeKit?.id) return;
    if (!editName.trim()) {
      setError('Brand name cannot be empty');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/brand-kits/${activeKit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          summary: editSummary.trim(),
          audience: editAudience.trim(),
          tone: editTone,
          dos: editDos,
          donts: editDonts,
          keywords: editKeywords,
          colors: {
            primary: editPrimary,
            secondary: editSecondary,
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${res.status}`);
      }

      const updated = await res.json();
      setBrandKits((prev) => prev.map((k) => (k.id === updated.id ? updated : k)));
      setIsEditing(false);
      setSuccess('Brand Kit updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update brand kit');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadSample = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/brand-kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sample: true }),
      });
      if (!res.ok) throw new Error('Failed to load template');
      const sampleKit = (await res.json()) as BrandKit;
      setBrandKits((prev) => [sampleKit, ...prev.filter((k) => k.id !== sampleKit.id)]);
      setSelectedKitId(sampleKit.id || null);
      setSuccess('Quick Start Template loaded!');
      setTimeout(() => setSuccess(null), 3000);
      await loadBrandKits();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleExtractUrl = async (targetUrl: string) => {
    if (!targetUrl.trim()) {
      setError('Please enter a valid website URL');
      return;
    }

    let validUrl = targetUrl.trim();
    if (!/^https?:\/\//i.test(validUrl)) {
      validUrl = `https://${validUrl}`;
    }

    try {
      new URL(validUrl);
    } catch {
      setError('Invalid URL format. Example: https://example.com');
      return;
    }

    setExtracting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/brand-kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: validUrl }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${res.status}`);
      }

      const created = (await res.json()) as BrandKit;
      setBrandKits((prev) => [created, ...prev.filter((k) => k.id !== created.id)]);
      setSelectedKitId(created.id || null);
      setExtractUrl('');
      setShowAddDialog(false);
      setSuccess(`Brand kit "${created.name}" synthesized!`);
      setTimeout(() => setSuccess(null), 4000);
      await loadBrandKits();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to extract brand facts');
    } finally {
      setExtracting(false);
    }
  };

  return (
    <AppShell
      title="Brand Kit Management"
      currentPath="/brand-kit"
      breadcrumbs={[
        { label: 'BrandPilot', href: '/' },
        { label: 'Brand Kit', href: '/brand-kit' },
      ]}
      actions={
        <div className="flex items-center gap-2">
          {activeKit && (
            <>
              <button
                type="button"
                onClick={() => setShowAddDialog((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-2 text-text hover:bg-border transition-colors border border-border shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddDialog ? 'Cancel' : 'Add Brand Kit'}</span>
              </button>
              <Link
                href="/agent"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-on-accent hover:bg-accent-hover transition-colors shadow-sm"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Launch Content Agent</span>
              </Link>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Alerts */}
        {error && (
          <div role="alert" className="flex items-center gap-2.5 p-3 rounded-lg bg-danger-soft text-danger border border-danger/20 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div role="status" className="flex items-center gap-2.5 p-3 rounded-lg bg-success-soft text-success border border-success/20 text-xs sm:text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-12 bg-surface rounded-xl border border-border">
            <Loader2 className="w-6 h-6 animate-spin text-accent mb-2" />
            <p className="text-sm text-text-muted">Loading brand kits...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !activeKit && (
          <div className="text-center p-8 sm:p-12 bg-surface rounded-xl border border-border space-y-6 max-w-2xl mx-auto shadow-sm">
            <div className="w-12 h-12 rounded-full bg-accent-soft text-accent flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text">No Brand Kit Configured</h2>
              <p className="text-sm text-text-muted mt-1.5 max-w-md mx-auto">
                Extract your brand identity directly from your live website URL or start instantly with an enterprise Quick Start Template.
              </p>
            </div>

            {/* Direct URL Extraction Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleExtractUrl(extractUrl);
              }}
              className="space-y-3"
            >
              <div className="flex flex-col sm:flex-row gap-2 max-w-lg mx-auto">
                <input
                  type="text"
                  value={extractUrl}
                  onChange={(e) => setExtractUrl(e.target.value)}
                  placeholder="https://yourbrand.com"
                  disabled={extracting}
                  className="flex-1 px-3.5 py-2 rounded-lg text-xs sm:text-sm bg-surface-2 border border-border text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="submit"
                  disabled={extracting || !extractUrl.trim()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-accent text-on-accent hover:bg-accent-hover transition-colors disabled:opacity-50 shrink-0"
                >
                  {extracting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Extracting...</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-3.5 h-3.5" />
                      <span>Extract from URL</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="flex items-center justify-center gap-3 pt-2 border-t border-border/60">
              <span className="text-xs text-text-muted">Or start instantly:</span>
              <button
                type="button"
                onClick={handleLoadSample}
                disabled={extracting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-surface-2 text-text hover:bg-border transition-colors border border-border"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load Quick Start Template</span>
              </button>
            </div>
          </div>
        )}

        {/* Collapsible Add Brand Kit Banner when kit already exists */}
        {!loading && activeKit && showAddDialog && (
          <div className="p-4 rounded-xl bg-surface-2 border border-border space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-text uppercase tracking-wider">Extract Another Brand Kit</h3>
              <button
                type="button"
                onClick={() => setShowAddDialog(false)}
                className="text-text-muted hover:text-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleExtractUrl(extractUrl);
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <input
                type="text"
                value={extractUrl}
                onChange={(e) => setExtractUrl(e.target.value)}
                placeholder="https://another-brand.com"
                disabled={extracting}
                className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="submit"
                disabled={extracting || !extractUrl.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-on-accent hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {extracting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5" />
                    <span>Extract</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Brand Kit Content */}
        {!loading && activeKit && (
          <div className="space-y-6">
            {/* Top Kit Selector bar if multiple kits */}
            {brandKits.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <span className="text-xs text-text-muted font-medium shrink-0">Brand Kits:</span>
                {brandKits.map((k) => (
                  <button
                    key={k.id}
                    onClick={() => {
                      setSelectedKitId(k.id || null);
                      setIsEditing(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shrink-0 ${
                      k.id === activeKit.id
                        ? 'bg-accent-soft text-accent border-accent/30 font-semibold'
                        : 'bg-surface text-text-muted border-border hover:text-text'
                    }`}
                  >
                    {k.name}
                  </button>
                ))}
              </div>
            )}

            {/* Header Card */}
            <div className="p-6 rounded-xl bg-surface border border-border shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-2.5 py-1 text-xl font-bold bg-surface-2 border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="Brand Name"
                      />
                    ) : (
                      <h1 className="text-2xl font-bold text-text tracking-tight">{activeKit.name}</h1>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent-soft text-accent border border-accent/20">
                      {activeKit.provider === 'gemini' ? 'Gemini 2.5 Flash' : 'High-Availability Fallback'}
                    </span>
                    {activeKit.sourceUrl && (
                      <a
                        href={activeKit.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-accent transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="truncate max-w-[200px]">{activeKit.sourceUrl}</span>
                      </a>
                    )}
                  </div>

                  {isEditing ? (
                    <textarea
                      value={editSummary}
                      onChange={(e) => setEditSummary(e.target.value)}
                      rows={3}
                      maxLength={280}
                      className="w-full mt-2 p-2.5 text-xs sm:text-sm bg-surface-2 border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="Brand summary..."
                    />
                  ) : (
                    <p className="text-sm text-text-muted leading-relaxed max-w-3xl pt-1">
                      {activeKit.summary}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-on-accent hover:bg-accent-hover transition-colors disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>Save</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-2 text-text hover:bg-border transition-colors border border-border"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-2 text-text hover:bg-border transition-colors border border-border"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Kit</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Colors Palette & Audience */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Color Palette */}
              <div className="p-5 rounded-xl bg-surface border border-border shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-accent" />
                    <h2 className="text-sm font-semibold text-text">WCAG AA Contrast Palette</h2>
                  </div>
                  <span className="text-[11px] text-text-muted flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-success" />
                    <span>Auto-Checked</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  {/* Primary */}
                  <div className="space-y-1.5">
                    <div
                      className="h-14 rounded-lg border border-border shadow-inner flex items-end p-1.5"
                      style={{ backgroundColor: isEditing ? editPrimary : activeKit.colors?.primary }}
                    >
                      <span className="text-[10px] font-mono px-1 rounded bg-black/40 text-white backdrop-blur-sm">
                        {isEditing ? editPrimary : activeKit.colors?.primary}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-text-muted">Primary</p>
                    {isEditing && (
                      <input
                        type="text"
                        value={editPrimary}
                        onChange={(e) => setEditPrimary(e.target.value)}
                        className="w-full px-1.5 py-0.5 text-xs bg-surface-2 border border-border rounded font-mono text-text"
                      />
                    )}
                  </div>

                  {/* Secondary */}
                  <div className="space-y-1.5">
                    <div
                      className="h-14 rounded-lg border border-border shadow-inner flex items-end p-1.5"
                      style={{ backgroundColor: isEditing ? editSecondary : activeKit.colors?.secondary }}
                    >
                      <span className="text-[10px] font-mono px-1 rounded bg-black/40 text-white backdrop-blur-sm">
                        {isEditing ? editSecondary : activeKit.colors?.secondary}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-text-muted">Secondary</p>
                    {isEditing && (
                      <input
                        type="text"
                        value={editSecondary}
                        onChange={(e) => setEditSecondary(e.target.value)}
                        className="w-full px-1.5 py-0.5 text-xs bg-surface-2 border border-border rounded font-mono text-text"
                      />
                    )}
                  </div>

                  {/* Background */}
                  <div className="space-y-1.5">
                    <div
                      className="h-14 rounded-lg border border-border shadow-inner flex items-end p-1.5"
                      style={{ backgroundColor: activeKit.colors?.background }}
                    >
                      <span className="text-[10px] font-mono px-1 rounded bg-black/40 text-white backdrop-blur-sm">
                        {activeKit.colors?.background}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-text-muted">Background</p>
                  </div>

                  {/* Text */}
                  <div className="space-y-1.5">
                    <div
                      className="h-14 rounded-lg border border-border shadow-inner flex items-end p-1.5"
                      style={{ backgroundColor: activeKit.colors?.text }}
                    >
                      <span className="text-[10px] font-mono px-1 rounded bg-white/20 text-white backdrop-blur-sm">
                        {activeKit.colors?.text}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-text-muted">Text</p>
                  </div>
                </div>
              </div>

              {/* Target Audience */}
              <div className="p-5 rounded-xl bg-surface border border-border shadow-sm space-y-2">
                <h2 className="text-sm font-semibold text-text">Target Audience</h2>
                {isEditing ? (
                  <textarea
                    value={editAudience}
                    onChange={(e) => setEditAudience(e.target.value)}
                    rows={3}
                    maxLength={300}
                    className="w-full p-2.5 text-xs bg-surface-2 border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                ) : (
                  <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                    {activeKit.audience}
                  </p>
                )}
                {/* Tone Tags */}
                <div className="pt-2">
                  <p className="text-xs font-semibold text-text mb-1.5">Brand Tone</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(activeKit.tone || []).map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md text-xs font-medium bg-surface-2 text-text border border-border capitalize"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Dos and Don'ts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Actionable Dos */}
              <div className="p-5 rounded-xl bg-surface border border-border shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <h2 className="text-sm font-semibold text-text">Actionable Brand Dos</h2>
                </div>
                <ul className="space-y-2">
                  {(activeKit.dos || []).map((doItem, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-text">
                      <span className="text-success font-bold">✓</span>
                      <span>{doItem}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actionable Don'ts */}
              <div className="p-5 rounded-xl bg-surface border border-border shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-danger" />
                  <h2 className="text-sm font-semibold text-text">Actionable Brand Don&apos;ts</h2>
                </div>
                <ul className="space-y-2">
                  {(activeKit.donts || []).map((dontItem, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-text">
                      <span className="text-danger font-bold">✗</span>
                      <span>{dontItem}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Keywords */}
            <div className="p-5 rounded-xl bg-surface border border-border shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-semibold text-text">Core Campaign Keywords</h2>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {(activeKit.keywords || []).map((kw, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-accent-soft text-accent border border-accent/20"
                  >
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
