import React, { useState } from 'react';
import {
  X,
  MapPin,
  CheckCircle2,
  ThumbsUp,
  CheckCheck,
  Wrench,
  Send,
  ShieldCheck,
  Navigation,
  Droplets,
  AlertOctagon,
  Clock
} from 'lucide-react';
import { HazardReport, Language, ReportStatus, VehicleProfile } from '../types';
import {
  CATEGORY_META,
  SEVERITY_META,
  STATUS_META,
  UI_TEXT,
  describeWaterDepth,
  formatRelativeTime
} from '../i18n';

interface IncidentDetailDrawerProps {
  report: HazardReport | null;
  vehicleProfiles: VehicleProfile[];
  lang: Language;
  isAdminMode: boolean;
  onClose: () => void;
  onVote: (reportId: string, voteType: 'confirm' | 'clear') => Promise<void>;
  onAddComment: (reportId: string, author: string, message: string, isOfficial: boolean) => Promise<void>;
  onAdminPatch: (
    reportId: string,
    patch: { status?: ReportStatus; verifiedOfficial?: boolean; crewDispatched?: boolean }
  ) => Promise<void>;
  onPlanDetourAround: (report: HazardReport) => void;
}

export const IncidentDetailDrawer: React.FC<IncidentDetailDrawerProps> = ({
  report,
  vehicleProfiles,
  lang,
  isAdminMode,
  onClose,
  onVote,
  onAddComment,
  onAdminPatch,
  onPlanDetourAround
}) => {
  const t = UI_TEXT[lang];
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [voting, setVoting] = useState(false);

  if (!report) return null;

  const sev = SEVERITY_META[report.severity] || SEVERITY_META.moderate;
  const cat = CATEGORY_META[report.category] || CATEGORY_META.waterlogging;
  const st = STATUS_META[report.status] || STATUS_META.active;

  const handleVote = async (type: 'confirm' | 'clear') => {
    setVoting(true);
    try {
      await onVote(report.id, type);
    } finally {
      setVoting(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await onAddComment(
        report.id,
        commentAuthor.trim() || (isAdminMode ? 'SCC Control Desk' : 'Sylhet Commuter'),
        commentText.trim(),
        isAdminMode
      );
      setCommentText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full sm:w-[390px] lg:w-[410px] h-full bg-[#08121e]/98 border-l border-slate-800 shadow-2xl flex flex-col z-[700] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-3 bg-slate-900/50">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${sev.badgeClass}`}>
              {lang === 'bn' ? sev.labelBn : sev.labelEn}
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${st.badgeClass}`}>
              {lang === 'bn' ? st.labelBn : st.labelEn}
            </span>
            <span className="text-[10px] font-mono-num text-slate-500">{report.id}</span>
          </div>
          <h2 className="text-sm sm:text-base font-extrabold text-white leading-snug">
            {lang === 'bn' && report.titleBn ? report.titleBn : report.title}
          </h2>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition cursor-pointer shrink-0"
          aria-label="Close inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Location & Metadata Strip */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              {report.areaName} ({report.ward})
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
            <span className={`px-2 py-0.5 rounded border font-semibold ${cat.bgClass}`}>
              {lang === 'bn' ? cat.labelBn : cat.labelEn}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> {formatRelativeTime(report.updatedAt, lang)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {report.verifiedOfficial ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/35 text-[11px] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> {t.verifiedOfficial}
              </span>
            ) : report.confirmations >= 4 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[11px] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> {t.communityVerified}
              </span>
            ) : null}

            {report.crewDispatched && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 text-[11px] font-semibold">
                <Wrench className="w-3.5 h-3.5" /> {t.crewDispatched}
              </span>
            )}
          </div>
        </div>

        {/* Scene Photo if provided */}
        {report.photoUrl && (
          <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
            <img
              src={report.photoUrl}
              alt={report.title}
              className="w-full h-44 object-cover"
            />
          </div>
        )}

        {/* Water Depth & Vehicle Passability Matrix */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-cyan-950/30 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-cyan-400" />
              {t.depthLabel}
            </span>
            <span className="font-mono-num text-sm font-extrabold text-cyan-300">
              {describeWaterDepth(report.waterDepthCm, lang)}
            </span>
          </div>

          {/* Depth Visual Bar */}
          {report.waterDepthCm > 0 && (
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, (report.waterDepthCm / 65) * 100)}%`,
                  background:
                    report.waterDepthCm >= 42
                      ? '#ef4444'
                      : report.waterDepthCm >= 25
                      ? '#f97316'
                      : '#06b6d4'
                }}
              />
            </div>
          )}

          {/* Vehicle Passability Grid */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {t.passabilityCheck}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {vehicleProfiles.map((v) => {
                const depth = report.status === 'resolved' ? 0 : report.waterDepthCm;
                const manholeDanger =
                  report.status !== 'resolved' &&
                  report.category === 'open_manhole' &&
                  v.manholeSensitive;

                let statusLabel = 'Passable';
                let cls = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';

                if (depth >= v.hardBlockDepthCm || (manholeDanger && depth >= 15)) {
                  statusLabel = 'Blocked / Stall';
                  cls = 'bg-red-500/15 border-red-500/35 text-red-300';
                } else if (depth > v.maxSafeDepthCm || manholeDanger || report.category === 'fallen_tree') {
                  statusLabel = 'High Risk';
                  cls = 'bg-amber-500/15 border-amber-500/35 text-amber-300';
                }

                return (
                  <div
                    key={v.id}
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center justify-between ${cls}`}
                  >
                    <span className="font-semibold truncate">
                      {lang === 'bn' ? v.nameBn : v.name}
                    </span>
                    <span className="font-bold text-[10px] shrink-0 ml-1">{statusLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Field Description */}
        <div className="space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Field Observation • Reported by {report.reporterName}
          </div>
          <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
            {report.description || 'No additional description provided.'}
          </p>
        </div>

        {/* Action Buttons: Upvote, Mark Cleared, Plan Detour */}
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={voting}
            onClick={() => handleVote('confirm')}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-xs font-bold transition cursor-pointer disabled:opacity-50"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>
              {t.confirmStillHere} ({report.confirmations})
            </span>
          </button>

          <button
            disabled={voting}
            onClick={() => handleVote('clear')}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-200 text-xs font-bold transition cursor-pointer disabled:opacity-50"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>
              {t.markCleared} ({report.clearVotes})
            </span>
          </button>
        </div>

        <button
          onClick={() => onPlanDetourAround(report)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 text-xs font-bold transition cursor-pointer"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>
            {lang === 'bn'
              ? 'এই ঝুঁকি এড়িয়ে নিরাপদ বিকল্প রুট দেখুন'
              : 'Find Safe Detour Avoiding This Corridor'}
          </span>
        </button>

        {/* SCC Moderator Quick Controls (if Admin Mode enabled) */}
        {isAdminMode && (
          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/40 space-y-2">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
              <AlertOctagon className="w-3.5 h-3.5" /> SCC Control Room Actions
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() =>
                  onAdminPatch(report.id, { verifiedOfficial: !report.verifiedOfficial })
                }
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-[11px] font-semibold border border-cyan-500/40 cursor-pointer"
              >
                {report.verifiedOfficial ? 'Unmark Official' : '✓ Verify Official'}
              </button>
              <button
                onClick={() =>
                  onAdminPatch(report.id, { crewDispatched: !report.crewDispatched })
                }
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-[11px] font-semibold border border-emerald-500/40 cursor-pointer"
              >
                {report.crewDispatched ? 'Recall Crew' : 'Dispatch SCC Crew'}
              </button>
              <select
                value={report.status}
                onChange={(e) =>
                  onAdminPatch(report.id, { status: e.target.value as ReportStatus })
                }
                className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-200 cursor-pointer"
              >
                <option value="active">Status: Active</option>
                <option value="monitoring">Status: Monitoring</option>
                <option value="resolved">Status: Resolved</option>
              </select>
            </div>
          </div>
        )}

        {/* Commuter Comments Thread */}
        <div className="space-y-2.5 pt-2 border-t border-slate-800">
          <h3 className="text-xs font-bold text-slate-300">
            {t.commentsTitle} ({report.comments.length})
          </h3>

          <div className="space-y-2">
            {report.comments.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">
                No field updates yet. Share current water level or traffic condition!
              </p>
            ) : (
              report.comments.map((c) => (
                <div
                  key={c.id}
                  className={`p-2.5 rounded-xl border text-xs ${
                    c.isOfficial
                      ? 'bg-cyan-950/35 border-cyan-500/35'
                      : 'bg-slate-900/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-slate-200 flex items-center gap-1">
                      {c.author}
                      {c.isOfficial && (
                        <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-extrabold">
                          SCC OFFICIAL
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono-num">
                      {formatRelativeTime(c.createdAt, lang)}
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{c.message}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleCommentSubmit} className="space-y-2 pt-1">
            <input
              type="text"
              value={commentAuthor}
              onChange={(e) => setCommentAuthor(e.target.value)}
              placeholder={lang === 'bn' ? 'আপনার নাম (ঐচ্ছিক)' : 'Your Name / Role (e.g. CNG Driver)'}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={
                  lang === 'bn'
                    ? 'সর্বশেষ অবস্থা লিখুন...'
                    : 'Share live water/traffic update...'
                }
                className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={submitting || !commentText.trim()}
                className="px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition disabled:opacity-40 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
