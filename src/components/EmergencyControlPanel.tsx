import React, { useState } from 'react';
import {
  PhoneCall,
  ShieldAlert,
  Building2,
  MapPin,
  CheckCircle2,
  Wrench,
  Trash2,
  RotateCcw,
  Megaphone
} from 'lucide-react';
import {
  AlertBannerState,
  EmergencyFacility,
  HazardReport,
  Language,
  ReportStatus
} from '../types';

interface EmergencyControlPanelProps {
  facilities: EmergencyFacility[];
  reports: HazardReport[];
  banner: AlertBannerState | undefined;
  lang: Language;
  isAdminMode: boolean;
  onToggleAdminMode: () => void;
  onFlyToFacility: (lat: number, lng: number) => void;
  onAdminPatchReport: (
    reportId: string,
    patch: { status?: ReportStatus; verifiedOfficial?: boolean; crewDispatched?: boolean }
  ) => Promise<void>;
  onAdminDeleteReport: (reportId: string) => Promise<void>;
  onUpdateBanner: (patch: Partial<AlertBannerState>) => Promise<void>;
  onResetSystem: () => Promise<void>;
}

export const EmergencyControlPanel: React.FC<EmergencyControlPanelProps> = ({
  facilities,
  reports,
  banner,
  lang,
  isAdminMode,
  onToggleAdminMode,
  onFlyToFacility,
  onAdminPatchReport,
  onAdminDeleteReport,
  onUpdateBanner,
  onResetSystem
}) => {
  const [bannerTitle, setBannerTitle] = useState(banner?.titleEn || '');
  const [bannerMsg, setBannerMsg] = useState(banner?.messageEn || '');
  const [bannerLevel, setBannerLevel] = useState<'info' | 'warning' | 'critical'>(
    banner?.level || 'warning'
  );
  const [savingBanner, setSavingBanner] = useState(false);

  const handleBroadcastBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBanner(true);
    try {
      await onUpdateBanner({
        active: true,
        level: bannerLevel,
        titleEn: bannerTitle,
        messageEn: bannerMsg
      });
    } finally {
      setSavingBanner(false);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-[#070f18] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Emergency Hotlines & Flood Shelters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <span>Sylhet Emergency Flood Shelters, SOS Hotlines &amp; SCC Control</span>
            </h1>
            <p className="text-xs text-slate-400">
              24/7 Rescue Contacts, Designated Flood Shelters &amp; Municipal Moderator Operations
            </p>
          </div>

          <button
            onClick={onToggleAdminMode}
            className={`px-4 py-2 rounded-xl border text-xs font-extrabold transition cursor-pointer ${
              isAdminMode
                ? 'bg-indigo-500/25 border-indigo-400 text-indigo-200 shadow-lg'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
            }`}
          >
            {isAdminMode ? '✓ SCC Moderator Mode: ON' : 'Switch to SCC Moderator Mode'}
          </button>
        </div>

        {/* National & Sylhet Rapid SOS Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a
            href="tel:999"
            className="p-4 rounded-2xl bg-red-950/35 hover:bg-red-950/50 border border-red-500/40 flex items-center justify-between transition"
          >
            <div>
              <div className="text-[11px] font-bold uppercase text-red-300">
                National Emergency (Police / Ambulance / Fire)
              </div>
              <div className="text-2xl font-extrabold font-mono-num text-white mt-0.5">999</div>
            </div>
            <PhoneCall className="w-6 h-6 text-red-400" />
          </a>

          <a
            href="tel:16999"
            className="p-4 rounded-2xl bg-amber-950/35 hover:bg-amber-950/50 border border-amber-500/40 flex items-center justify-between transition"
          >
            <div>
              <div className="text-[11px] font-bold uppercase text-amber-300">
                BPDB Live Wire / Flooded Transformer Shutoff
              </div>
              <div className="text-2xl font-extrabold font-mono-num text-white mt-0.5">16999</div>
            </div>
            <PhoneCall className="w-6 h-6 text-amber-400" />
          </a>

          <a
            href="tel:1090"
            className="p-4 rounded-2xl bg-cyan-950/35 hover:bg-cyan-950/50 border border-cyan-500/40 flex items-center justify-between transition"
          >
            <div>
              <div className="text-[11px] font-bold uppercase text-cyan-300">
                Bangladesh Flood Forecasting &amp; Disaster Info
              </div>
              <div className="text-2xl font-extrabold font-mono-num text-white mt-0.5">1090</div>
            </div>
            <PhoneCall className="w-6 h-6 text-cyan-400" />
          </a>
        </div>

        {/* Shelters & Emergency Facilities Grid */}
        <div className="space-y-3">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>Designated Sylhet Flood Shelters, Hospitals &amp; Rescue Stations</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {facilities.map((fac) => (
              <div
                key={fac.id}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    {fac.type.replace('_', ' ')} • {fac.ward}
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    {lang === 'bn' ? fac.nameBn : fac.name}
                  </h3>
                  <p className="text-xs text-slate-400">{fac.capacity}</p>
                  <div className="pt-1 flex items-center gap-3">
                    <a
                      href={`tel:${fac.phone}`}
                      className="text-xs font-mono-num font-bold text-cyan-300 hover:underline"
                    >
                      ☎ {fac.phone}
                    </a>
                  </div>
                </div>

                <button
                  onClick={() => onFlyToFacility(fac.lat, fac.lng)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Locate</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* SCC Municipal Control Room Section */}
        <div className="p-5 rounded-2xl bg-indigo-950/25 border border-indigo-500/35 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-500/25 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-indigo-400" />
                <span>SCC Nagar Bhaban Municipal Dispatch &amp; Broadcast Console</span>
              </h2>
              <p className="text-xs text-slate-400">
                Verify citizen reports, dispatch suction pumps / drainage teams, or update city-wide flood alerts.
              </p>
            </div>
            <button
              onClick={onResetSystem}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo Dataset</span>
            </button>
          </div>

          {/* Emergency Broadcast Editor */}
          <form onSubmit={handleBroadcastBanner} className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-3">
              <label className="text-[11px] text-slate-400 block mb-1">Alert Level</label>
              <select
                value={bannerLevel}
                onChange={(e) => setBannerLevel(e.target.value as 'info' | 'warning' | 'critical')}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              >
                <option value="info">Info Advisory</option>
                <option value="warning">Monsoon Warning</option>
                <option value="critical">Red Flash-Flood Alert</option>
              </select>
            </div>
            <div className="md:col-span-4">
              <label className="text-[11px] text-slate-400 block mb-1">Broadcast Headline</label>
              <input
                type="text"
                value={bannerTitle}
                onChange={(e) => setBannerTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
            </div>
            <div className="md:col-span-5">
              <label className="text-[11px] text-slate-400 block mb-1">Public Advisory Message</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={bannerMsg}
                  onChange={(e) => setBannerMsg(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
                <button
                  type="submit"
                  disabled={savingBanner}
                  className="px-3.5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shrink-0 cursor-pointer"
                >
                  Broadcast
                </button>
              </div>
            </div>
          </form>

          {/* Incident Dispatch Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-3">ID &amp; Area</th>
                  <th className="py-2.5 px-3">Hazard</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">SCC Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-100">{r.areaName}</div>
                      <div className="text-[10px] text-slate-500 font-mono-num">
                        {r.id} • {r.ward}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-slate-200">{r.title}</div>
                      {r.waterDepthCm > 0 && (
                        <span className="text-[10px] text-cyan-300 font-mono-num">
                          Depth: {r.waterDepthCm} cm
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={r.status}
                        onChange={(e) =>
                          onAdminPatchReport(r.id, { status: e.target.value as ReportStatus })
                        }
                        className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-200 cursor-pointer"
                      >
                        <option value="active">Active</option>
                        <option value="monitoring">Monitoring</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            onAdminPatchReport(r.id, { verifiedOfficial: !r.verifiedOfficial })
                          }
                          className={`p-1.5 rounded-lg border transition cursor-pointer ${
                            r.verifiedOfficial
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                              : 'bg-slate-900 border-slate-700 text-slate-400'
                          }`}
                          title="Toggle SCC Official Verification"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() =>
                            onAdminPatchReport(r.id, { crewDispatched: !r.crewDispatched })
                          }
                          className={`p-1.5 rounded-lg border transition cursor-pointer ${
                            r.crewDispatched
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                              : 'bg-slate-900 border-slate-700 text-slate-400'
                          }`}
                          title="Toggle Drainage Crew Dispatch"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onAdminDeleteReport(r.id)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-500/20 border border-slate-700 hover:border-red-500/40 text-slate-400 hover:text-red-300 transition cursor-pointer"
                          title="Remove Report"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
