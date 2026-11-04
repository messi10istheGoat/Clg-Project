import React from 'react';
import {
  MapPin,
  Navigation,
  Waves,
  BarChart3,
  ShieldAlert,
  Plus,
  Droplets,
  Radio
} from 'lucide-react';
import { ActiveTab, HydrologyState, Language } from '../types';
import { UI_TEXT } from '../i18n';

interface TopNavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  lang: Language;
  onToggleLang: () => void;
  activeHazardCount: number;
  criticalCount: number;
  hydrology: HydrologyState | null;
  onOpenReportModal: () => void;
  sseConnected: boolean;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  activeTab,
  onSelectTab,
  lang,
  onToggleLang,
  activeHazardCount,
  criticalCount,
  hydrology,
  onOpenReportModal,
  sseConnected
}) => {
  const t = UI_TEXT[lang];
  const surma = hydrology?.gauges?.[0];
  const surmaAboveDl = surma ? surma.currentLevelM >= surma.dangerLevelM : false;

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'map', label: t.navMap, icon: <MapPin className="w-4 h-4" />, badge: activeHazardCount },
    { id: 'routes', label: t.navRoutes, icon: <Navigation className="w-4 h-4" /> },
    { id: 'hydrology', label: t.navHydrology, icon: <Waves className="w-4 h-4" /> },
    { id: 'analytics', label: t.navAnalytics, icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'emergency', label: t.navEmergency, icon: <ShieldAlert className="w-4 h-4" /> }
  ];

  return (
    <header className="sticky top-0 z-[1000] bg-[#08121e]/95 backdrop-blur-md border-b border-slate-800/90 shadow-lg">
      <div className="max-w-[1920px] mx-auto px-3 sm:px-5 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Identity */}
        <div
          onClick={() => onSelectTab('map')}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
        >
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/25 to-blue-600/20 border border-cyan-400/35 flex items-center justify-center shadow-inner group-hover:border-cyan-400/70 transition">
            <Waves className="w-5 h-5 text-cyan-400" />
            <span
              className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ring-2 ring-[#08121e] ${
                sseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
              title={sseConnected ? 'Real-time stream connected' : 'Connecting stream...'}
            />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-sm sm:text-base text-white">
                {t.appName}
              </span>
              <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                <Radio className="w-2.5 h-2.5" /> SCC
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block truncate max-w-[230px] lg:max-w-none">
              {t.appSub}
            </p>
          </div>
        </div>

        {/* Center Navigation Tabs (Desktop) */}
        <nav className="hidden lg:flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1 gap-1">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono-num ${
                      criticalCount > 0
                        ? 'bg-red-500/25 text-red-200 border border-red-500/40'
                        : 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Live Telemetry Micro-Strip (XL Screens) + Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {surma && hydrology && (
            <div className="hidden xl:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <div
                onClick={() => onSelectTab('hydrology')}
                className="flex items-center gap-1.5 cursor-pointer hover:opacity-90"
                title="Surma River Gauge at Chandni Ghat (Danger Level: 10.80m)"
              >
                <Waves className={`w-3.5 h-3.5 ${surmaAboveDl ? 'text-red-400' : 'text-cyan-400'}`} />
                <span className="text-slate-400">{t.surmaGauge}:</span>
                <span
                  className={`font-mono-num font-bold ${
                    surmaAboveDl ? 'text-red-300' : 'text-cyan-200'
                  }`}
                >
                  {surma.currentLevelM.toFixed(2)}m
                </span>
              </div>
              <div className="w-px h-3.5 bg-slate-700" />
              <div
                onClick={() => onSelectTab('hydrology')}
                className="flex items-center gap-1.5 cursor-pointer hover:opacity-90"
                title="24h Rainfall in Sylhet & Upstream Cherrapunji"
              >
                <Droplets className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-slate-400">{t.rain24h}:</span>
                <span className="font-mono-num font-bold text-sky-200">
                  {hydrology.sylhetRainfall24hMm}mm
                </span>
                <span className="text-[10px] text-slate-400">
                  (Cherrapunji {hydrology.cherrapunjiUpstream24hMm}mm)
                </span>
              </div>
            </div>
          )}

          {/* Language Toggle EN / বাং */}
          <button
            onClick={onToggleLang}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-bold text-slate-200 transition cursor-pointer"
            title="Switch Language (English / বাংলা)"
          >
            {lang === 'en' ? 'বাং' : 'EN'}
          </button>

          {/* Primary Report Hazard CTA */}
          <button
            onClick={onOpenReportModal}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/20 transition transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.6]" />
            <span>{t.reportBtn}</span>
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Navigation Bar */}
      <div className="flex lg:hidden items-center justify-between px-2 py-1.5 bg-[#060e17] border-t border-slate-800/80 overflow-x-auto gap-1">
        {navItems.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex-1 min-w-[68px] flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                active
                  ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/35'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
