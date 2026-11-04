import React from 'react';
import {
  Search,
  CheckCircle2,
  Wrench,
  ThumbsUp,
  MessageSquare,
  Droplets,
  MapPin,
  SlidersHorizontal
} from 'lucide-react';
import { HazardCategory, HazardReport, HazardSeverity, Language } from '../types';
import {
  CATEGORY_META,
  SEVERITY_META,
  STATUS_META,
  UI_TEXT,
  formatRelativeTime
} from '../i18n';

interface IncidentSidebarProps {
  reports: HazardReport[];
  selectedReportId: string | null;
  onSelectReport: (report: HazardReport) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  categoryFilter: HazardCategory | 'all';
  onCategoryChange: (cat: HazardCategory | 'all') => void;
  severityFilter: HazardSeverity | 'all';
  onSeverityChange: (sev: HazardSeverity | 'all') => void;
  showResolved: boolean;
  onToggleResolved: () => void;
  lang: Language;
}

export const IncidentSidebar: React.FC<IncidentSidebarProps> = ({
  reports,
  selectedReportId,
  onSelectReport,
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  severityFilter,
  onSeverityChange,
  showResolved,
  onToggleResolved,
  lang
}) => {
  const t = UI_TEXT[lang];

  const categories: { id: HazardCategory | 'all'; label: string }[] = [
    { id: 'all', label: t.filterAll },
    { id: 'waterlogging', label: t.filterWater },
    { id: 'open_manhole', label: t.filterManhole },
    { id: 'pothole', label: t.filterPothole },
    { id: 'road_construction', label: t.filterRoadwork },
    { id: 'fallen_tree', label: t.filterTree }
  ];

  return (
    <aside className="w-full h-full flex flex-col bg-[#08121e] border-r border-slate-800/90">
      {/* Search & Filter Header */}
      <div className="p-3.5 border-b border-slate-800/80 space-y-2.5 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 focus:outline-none text-xs text-slate-100 placeholder:text-slate-500"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {categories.map((c) => {
            const active = categoryFilter === c.id;
            return (
              <button
                key={c.id}
                onClick={() => onCategoryChange(c.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap border transition cursor-pointer ${
                  active
                    ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/45'
                    : 'bg-slate-900/70 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Sub-filters: Severity + Include Resolved */}
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={severityFilter}
              onChange={(e) => onSeverityChange(e.target.value as HazardSeverity | 'all')}
              className="bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="all">All Severities ({reports.length})</option>
              <option value="critical">Critical Only</option>
              <option value="high">High &amp; Above</option>
              <option value="moderate">Moderate</option>
              <option value="low">Low / Minor</option>
            </select>
          </div>

          <label className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={onToggleResolved}
              className="accent-cyan-400 rounded cursor-pointer"
            />
            <span>{t.showResolved}</span>
          </label>
        </div>
      </div>

      {/* Live Feed List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {reports.length === 0 ? (
          <div className="text-center py-12 px-4 text-slate-400 text-xs">
            No hazard reports match your current filter in Sylhet.
          </div>
        ) : (
          reports.map((rpt) => {
            const sev = SEVERITY_META[rpt.severity] || SEVERITY_META.moderate;
            const cat = CATEGORY_META[rpt.category] || CATEGORY_META.waterlogging;
            const st = STATUS_META[rpt.status] || STATUS_META.active;
            const selected = rpt.id === selectedReportId;

            return (
              <div
                key={rpt.id}
                onClick={() => onSelectReport(rpt)}
                className={`group relative rounded-xl p-3 border transition-all cursor-pointer ${
                  selected
                    ? 'bg-cyan-950/35 border-cyan-400/60 shadow-lg shadow-cyan-950/40'
                    : 'bg-slate-900/65 hover:bg-slate-900 border-slate-800/90 hover:border-slate-700'
                }`}
              >
                {/* Left severity accent strip */}
                <span
                  className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full"
                  style={{
                    backgroundColor: rpt.status === 'resolved' ? '#10b981' : sev.hex
                  }}
                />

                <div className="pl-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        rpt.status === 'resolved' ? st.badgeClass : sev.badgeClass
                      }`}
                    >
                      {rpt.status === 'resolved'
                        ? lang === 'bn'
                          ? st.labelBn
                          : st.labelEn
                        : lang === 'bn'
                        ? sev.labelBn
                        : sev.labelEn}
                    </span>

                    <span className="text-[10px] text-slate-400 font-mono-num">
                      {formatRelativeTime(rpt.updatedAt, lang)}
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-[13px] font-bold text-slate-100 leading-snug group-hover:text-cyan-200 transition">
                    {lang === 'bn' && rpt.titleBn ? rpt.titleBn : rpt.title}
                  </h3>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="truncate">
                      {rpt.areaName} • <span className="text-slate-500">{rpt.ward}</span>
                    </span>
                  </div>

                  {/* Metrics & Badges Row */}
                  <div className="pt-1 flex flex-wrap items-center justify-between gap-1.5 text-[10px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded border font-semibold ${cat.bgClass}`}>
                        {cat.shortEn}
                      </span>

                      {rpt.waterDepthCm > 0 && rpt.status !== 'resolved' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-mono-num font-bold">
                          <Droplets className="w-2.5 h-2.5" />
                          {rpt.waterDepthCm} cm
                        </span>
                      )}

                      {rpt.verifiedOfficial && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold"
                          title="Verified by Sylhet City Corporation Control Room"
                        >
                          <CheckCircle2 className="w-2.5 h-2.5" /> SCC
                        </span>
                      )}

                      {rpt.crewDispatched && rpt.status !== 'resolved' && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold"
                          title="SCC Drainage Crew Dispatched"
                        >
                          <Wrench className="w-2.5 h-2.5" /> Crew
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-slate-400 font-mono-num">
                      <span className="inline-flex items-center gap-0.5">
                        <ThumbsUp className="w-3 h-3 text-slate-400" />
                        {rpt.confirmations}
                      </span>
                      {rpt.comments.length > 0 && (
                        <span className="inline-flex items-center gap-0.5">
                          <MessageSquare className="w-3 h-3 text-slate-400" />
                          {rpt.comments.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
