import React, { useState } from 'react';
import {
  Waves,
  CloudRain,
  Thermometer,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sliders,
  MapPin,
  Sparkles
} from 'lucide-react';
import {
  HydroChannel,
  HydrologyState,
  Language,
  RiverGauge,
  ScenarioSummary
} from '../types';
import { LiveOpenMeteoWeather } from '../services/api';

interface HydrologyDashboardProps {
  hydrology: HydrologyState | null;
  scenarios: ScenarioSummary[];
  channels: HydroChannel[];
  liveWeather: LiveOpenMeteoWeather | null;
  lang: Language;
  onSelectScenario: (scenarioId: string) => Promise<void>;
  onFlyToMapPoint: (lat: number, lng: number) => void;
}

const HydrographSparkline: React.FC<{ gauge: RiverGauge }> = ({ gauge }) => {
  const vals = gauge.history24h;
  const allVals = [...vals, gauge.dangerLevelM];
  const minV = Math.min(...allVals) - 0.25;
  const maxV = Math.max(...allVals) + 0.25;
  const range = Math.max(0.2, maxV - minV);

  const w = 260;
  const h = 72;

  const toY = (v: number) => h - 8 - ((v - minV) / range) * (h - 16);
  const points = vals
    .map((v, idx) => {
      const x = 8 + (idx / Math.max(1, vals.length - 1)) * (w - 16);
      return `${x.toFixed(1)},${toY(v).toFixed(1)}`;
    })
    .join(' ');

  const dlY = toY(gauge.dangerLevelM);
  const aboveDl = gauge.currentLevelM >= gauge.dangerLevelM;
  const stroke = aboveDl ? '#ef4444' : '#38bdf8';

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20 overflow-visible">
      {/* Danger Level Reference Line */}
      <line
        x1={6}
        y1={dlY}
        x2={w - 6}
        y2={dlY}
        stroke="#ef4444"
        strokeWidth="1.3"
        strokeDasharray="4 4"
        opacity={0.75}
      />
      <text x={w - 8} y={dlY - 4} textAnchor="end" fill="#fca5a5" fontSize="8.5" fontWeight="700">
        DL {gauge.dangerLevelM.toFixed(2)}m
      </text>

      {/* Water Level Polyline */}
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {vals.map((v, idx) => {
        const x = 8 + (idx / Math.max(1, vals.length - 1)) * (w - 16);
        const y = toY(v);
        return (
          <circle
            key={idx}
            cx={x}
            cy={y}
            r={idx === vals.length - 1 ? 4 : 2.2}
            fill={idx === vals.length - 1 ? '#ffffff' : stroke}
            stroke={stroke}
            strokeWidth="1.5"
          />
        );
      })}
    </svg>
  );
};

export const HydrologyDashboard: React.FC<HydrologyDashboardProps> = ({
  hydrology,
  scenarios,
  channels,
  liveWeather,
  lang,
  onSelectScenario,
  onFlyToMapPoint
}) => {
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  if (!hydrology) return null;

  const handleScenarioClick = async (id: string) => {
    setSwitchingId(id);
    try {
      await onSelectScenario(id);
    } finally {
      setSwitchingId(null);
    }
  };

  const displayTemp = liveWeather ? liveWeather.tempC : hydrology.temperatureC;
  const displayHum = liveWeather ? liveWeather.humidityPct : hydrology.humidityPct;

  return (
    <div className="w-full h-full overflow-y-auto bg-[#070f18] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Section: Atmospheric & Upstream Meghalaya Telemetry */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <CloudRain className="w-4 h-4 text-cyan-400" />
              <span>Sylhet 24h Rainfall</span>
            </div>
            <div className="text-2xl font-extrabold font-mono-num text-white">
              {hydrology.sylhetRainfall24hMm} <span className="text-sm text-cyan-300">mm</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Current intensity: <b className="text-sky-300">{hydrology.currentRainRateMmHr} mm/hr</b>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/30 space-y-1">
            <div className="text-xs text-indigo-300 font-semibold flex items-center gap-1.5">
              <Waves className="w-4 h-4 text-indigo-400" />
              <span>Cherrapunji Upstream (24h)</span>
            </div>
            <div className="text-2xl font-extrabold font-mono-num text-white">
              {hydrology.cherrapunjiUpstream24hMm}{' '}
              <span className="text-sm text-indigo-300">mm</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Meghalaya hill runoff reaches Surma in ~14–18 hrs
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-amber-400" /> Sylhet Atmosphere
              </span>
              {liveWeather?.fetchedLive && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[9px] font-bold">
                  OPEN-METEO LIVE
                </span>
              )}
            </div>
            <div className="text-2xl font-extrabold font-mono-num text-white">
              {displayTemp.toFixed(1)}°C{' '}
              <span className="text-sm font-normal text-slate-400">/ {displayHum}% RH</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Soil saturation index:{' '}
              <b className="text-amber-300">
                {hydrology.sylhetRainfall24hMm > 100 ? '96% Saturated' : '82% High'}
              </b>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Gravity Drainage Outfall</span>
            </div>
            <div className="text-lg font-extrabold text-white pt-0.5">
              {hydrology.gauges[0]?.currentLevelM >= hydrology.gauges[0]?.dangerLevelM
                ? 'Backflow Active (Sluice Alert)'
                : hydrology.gauges[0]?.currentLevelM >= 10.4
                ? 'Throttled Outfall (Slow)'
                : 'Free Gravity Discharge'}
            </div>
            <div className="text-[11px] text-slate-400">
              Chandni Ghat &amp; Sheikhghat chara outfalls
            </div>
          </div>
        </div>

        {/* Interactive Monsoon Scenario Simulator */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/35 border border-cyan-500/35 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Interactive Monsoon &amp; Flash-Flood Scenario Simulator</span>
              </h2>
              <p className="text-xs text-slate-300">
                Test how Sylhet&apos;s road network, low-lying wards, and safe commuter detours respond across hydrological conditions:
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-xs font-bold shrink-0">
              <Sparkles className="w-3.5 h-3.5" /> Active: {hydrology.scenarioLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {scenarios.map((sc) => {
              const active = hydrology.scenarioId === sc.id;
              return (
                <button
                  key={sc.id}
                  disabled={switchingId !== null}
                  onClick={() => handleScenarioClick(sc.id)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    active
                      ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-lg shadow-cyan-950/50'
                      : 'bg-slate-950/75 hover:bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="text-xs font-extrabold leading-snug">{sc.label}</div>
                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono-num text-slate-400">
                    <span>Rain: {sc.rain24h}mm</span>
                    <span className={sc.surmaLevelM >= 10.8 ? 'text-red-300 font-bold' : 'text-cyan-300'}>
                      Surma: {sc.surmaLevelM.toFixed(2)}m
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* BWDB River Water Level Gauges */}
        <div className="space-y-3">
          <h2 className="text-sm sm:text-base font-extrabold text-white">
            Sylhet Basin River Gauges (24-Hour Hydrograph vs BWDB Danger Level)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hydrology.gauges.map((g) => {
              const diffCm = Math.round((g.currentLevelM - g.dangerLevelM) * 100);
              const isDanger = diffCm >= 0;
              return (
                <div
                  key={g.id}
                  className={`p-4 rounded-2xl border space-y-3 ${
                    isDanger
                      ? 'bg-red-950/20 border-red-500/45'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                        {g.river}
                      </div>
                      <h3 className="text-sm font-extrabold text-white">
                        {lang === 'bn' ? g.stationBn : g.station}
                      </h3>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                        isDanger
                          ? 'bg-red-500/20 border-red-500/40 text-red-200'
                          : 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                      }`}
                    >
                      {isDanger ? `+${diffCm} cm ABOVE DL` : `${Math.abs(diffCm)} cm below DL`}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-extrabold font-mono-num text-white">
                      {g.currentLevelM.toFixed(2)} m{' '}
                      <span className="text-xs font-normal text-slate-400">
                        (Danger: {g.dangerLevelM.toFixed(2)} m)
                      </span>
                    </div>
                    <div
                      className={`text-xs font-bold flex items-center gap-1 font-mono-num ${
                        g.change6hCm > 0 ? 'text-amber-300' : 'text-emerald-300'
                      }`}
                    >
                      {g.change6hCm > 0 ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      {g.change6hCm > 0 ? `+${g.change6hCm}` : g.change6hCm} cm / 6h
                    </div>
                  </div>

                  <HydrographSparkline gauge={g} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Natural Chara (Storm Drainage Stream) Health */}
        <div className="space-y-3">
          <h2 className="text-sm sm:text-base font-extrabold text-white">
            Sylhet Natural Chara (Drainage Canal) Flow &amp; Culvert Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {channels.map((ch) => {
              const midCoord = ch.coords[Math.floor(ch.coords.length / 2)];
              return (
                <div
                  key={ch.id}
                  className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">
                        {lang === 'bn' ? ch.nameBn : ch.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          ch.status.includes('critical')
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-sky-500/20 text-sky-300'
                        }`}
                      >
                        {ch.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{ch.statusNote}</p>
                  </div>

                  <button
                    onClick={() => onFlyToMapPoint(midCoord[0], midCoord[1])}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Map</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
