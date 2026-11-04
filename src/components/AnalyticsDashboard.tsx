import React from 'react';
import {
  Download,
  CheckCircle2,
  Wrench,
  AlertOctagon,
  Droplets,
  MapPin
} from 'lucide-react';
import { HazardCategory, HazardReport, Language } from '../types';
import { CATEGORY_META, SEVERITY_META } from '../i18n';

interface AnalyticsDashboardProps {
  reports: HazardReport[];
  lang: Language;
  onInspectReport: (report: HazardReport) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  reports,
  lang,
  onInspectReport
}) => {
  const activeReports = reports.filter((r) => r.status !== 'resolved');
  const criticalCount = activeReports.filter((r) => r.severity === 'critical').length;
  const verifiedCount = reports.filter((r) => r.verifiedOfficial).length;
  const crewsActive = activeReports.filter((r) => r.crewDispatched).length;

  const waterReports = activeReports.filter((r) => r.waterDepthCm > 0);
  const avgDepthCm =
    waterReports.length > 0
      ? Math.round(
          waterReports.reduce((acc, r) => acc + r.waterDepthCm, 0) / waterReports.length
        )
      : 0;

  // Category Breakdown
  const catCounts = (Object.keys(CATEGORY_META) as HazardCategory[]).map((cat) => ({
    cat,
    meta: CATEGORY_META[cat],
    count: activeReports.filter((r) => r.category === cat).length
  }));
  const maxCat = Math.max(1, ...catCounts.map((c) => c.count));

  // Ward Aggregation
  const wardMap = new Map<
    string,
    { ward: string; areas: Set<string>; active: number; maxDepth: number; topReport: HazardReport }
  >();
  for (const r of reports) {
    const existing = wardMap.get(r.ward);
    if (!existing) {
      wardMap.set(r.ward, {
        ward: r.ward,
        areas: new Set([r.areaName]),
        active: r.status !== 'resolved' ? 1 : 0,
        maxDepth: r.status !== 'resolved' ? r.waterDepthCm : 0,
        topReport: r
      });
    } else {
      existing.areas.add(r.areaName);
      if (r.status !== 'resolved') {
        existing.active += 1;
        if (r.waterDepthCm > existing.maxDepth) {
          existing.maxDepth = r.waterDepthCm;
          existing.topReport = r;
        }
      }
    }
  }
  const wardStats = Array.from(wardMap.values()).sort(
    (a, b) => b.maxDepth - a.maxDepth || b.active - a.active
  );

  return (
    <div className="w-full h-full overflow-y-auto bg-[#070f18] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header + Open Data Export */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white">
              Sylhet City Corporation — Ward Hazard &amp; Drainage Analytics
            </h1>
            <p className="text-xs text-slate-400">
              Real-time municipal situational overview &amp; open civic dataset export
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/api/export/csv"
              download="sylhet-live-hazards.csv"
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-cyan-300 flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>
            <a
              href="/api/export/json"
              download="sylhet-live-hazards.json"
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-emerald-300 flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </a>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-red-400" /> Active Hazards
            </div>
            <div className="text-2xl font-extrabold font-mono-num text-white mt-1">
              {activeReports.length}{' '}
              <span className="text-xs font-semibold text-red-300">
                ({criticalCount} Critical)
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-cyan-400" /> Mean Street Depth
            </div>
            <div className="text-2xl font-extrabold font-mono-num text-cyan-300 mt-1">
              {avgDepthCm} cm
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-sky-400" /> SCC Verified Reports
            </div>
            <div className="text-2xl font-extrabold font-mono-num text-white mt-1">
              {verifiedCount}{' '}
              <span className="text-xs text-slate-400">/ {reports.length} total</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-emerald-400" />SCC Crews Deployed
            </div>
            <div className="text-2xl font-extrabold font-mono-num text-emerald-300 mt-1">
              {crewsActive} Teams
            </div>
          </div>
        </div>

        {/* Category & Severity Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <h2 className="text-sm font-extrabold text-white">Active Hazards by Category</h2>
            <div className="space-y-3">
              {catCounts.map(({ cat, meta, count }) => (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-200">
                      {lang === 'bn' ? meta.labelBn : meta.labelEn}
                    </span>
                    <span className="font-mono-num font-bold text-slate-300">{count}</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(count / maxCat) * 100}%`,
                        backgroundColor: meta.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <h2 className="text-sm font-extrabold text-white">Severity Distribution</h2>
            <div className="grid grid-cols-2 gap-3 pt-1">
              {(['critical', 'high', 'moderate', 'low'] as const).map((sevKey) => {
                const cnt = activeReports.filter((r) => r.severity === sevKey).length;
                const meta = SEVERITY_META[sevKey];
                return (
                  <div
                    key={sevKey}
                    className="p-3.5 rounded-xl bg-slate-950/75 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div
                        className="text-xs font-extrabold capitalize"
                        style={{ color: meta.hex }}
                      >
                        {lang === 'bn' ? meta.labelBn : meta.labelEn}
                      </div>
                      <div className="text-[11px] text-slate-500">Active Spots</div>
                    </div>
                    <div className="text-2xl font-extrabold font-mono-num text-white">{cnt}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Ward Impact Table */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-sm font-extrabold text-white">
              SCC Ward-by-Ward Waterlogging &amp; Road Risk Matrix
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">SCC Ward</th>
                  <th className="py-3 px-4">Affected Neighborhoods</th>
                  <th className="py-3 px-4">Active Incidents</th>
                  <th className="py-3 px-4">Peak Water Depth</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {wardStats.map((w) => (
                  <tr key={w.ward} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-white whitespace-nowrap">{w.ward}</td>
                    <td className="py-3 px-4 text-slate-300">
                      {Array.from(w.areas).join(', ')}
                    </td>
                    <td className="py-3 px-4 font-mono-num font-bold text-cyan-300">
                      {w.active}
                    </td>
                    <td className="py-3 px-4 font-mono-num">
                      {w.maxDepth > 0 ? (
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            w.maxDepth >= 42
                              ? 'bg-red-500/20 text-red-300'
                              : w.maxDepth >= 25
                              ? 'bg-orange-500/20 text-orange-300'
                              : 'bg-cyan-500/20 text-cyan-300'
                          }`}
                        >
                          {w.maxDepth} cm
                        </span>
                      ) : (
                        <span className="text-slate-500">Dry / Surface</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onInspectReport(w.topReport)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 font-semibold text-[11px] cursor-pointer"
                      >
                        <MapPin className="w-3 h-3" /> Inspect on Map
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
