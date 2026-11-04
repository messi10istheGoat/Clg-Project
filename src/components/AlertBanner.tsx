import React, { useState } from 'react';
import { AlertTriangle, Info, Radio, X, ArrowRight } from 'lucide-react';
import { ActiveTab, AlertBannerState, Language } from '../types';

interface AlertBannerProps {
  banner: AlertBannerState | undefined;
  lang: Language;
  onNavigate: (tab: ActiveTab) => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ banner, lang, onNavigate }) => {
  const [dismissedTitle, setDismissedTitle] = useState<string | null>(null);

  if (!banner || !banner.active) return null;
  const currentTitle = lang === 'bn' ? banner.titleBn || banner.titleEn : banner.titleEn;
  const currentMsg = lang === 'bn' ? banner.messageBn || banner.messageEn : banner.messageEn;

  if (dismissedTitle === currentTitle) return null;

  const styles =
    banner.level === 'critical'
      ? 'bg-gradient-to-r from-red-950/95 via-rose-950/90 to-red-950/95 border-red-500/50 text-red-100'
      : banner.level === 'warning'
      ? 'bg-gradient-to-r from-amber-950/90 via-orange-950/85 to-amber-950/90 border-amber-500/45 text-amber-100'
      : 'bg-gradient-to-r from-cyan-950/90 via-slate-900/90 to-cyan-950/90 border-cyan-500/40 text-cyan-100';

  return (
    <div className={`border-b px-3 sm:px-5 py-2 text-xs relative z-[900] ${styles}`}>
      <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div className="shrink-0 mt-0.5 sm:mt-0">
            {banner.level === 'critical' ? (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500/25 border border-red-400/50 animate-pulse">
                <Radio className="w-3.5 h-3.5 text-red-300" />
              </span>
            ) : banner.level === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            ) : (
              <Info className="w-4 h-4 text-cyan-400" />
            )}
          </div>
          <div className="min-w-0">
            <span className="font-bold tracking-wide mr-2">{currentTitle}:</span>
            <span className="opacity-90">{currentMsg}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigate('routes')}
            className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-[11px] font-semibold transition cursor-pointer"
          >
            <span>{lang === 'bn' ? 'নিরাপদ রুট' : 'Safe Detours'}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => setDismissedTitle(currentTitle)}
            className="p-1 rounded-md hover:bg-white/10 transition cursor-pointer"
            aria-label="Dismiss alert"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
