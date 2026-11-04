import React, { useEffect, useState } from 'react';
import {
  Navigation,
  ArrowUpDown,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Sparkles,
  Clock,
  Droplets,
  Route as RouteIcon
} from 'lucide-react';
import {
  Language,
  RoadNode,
  RouteResponse,
  VehicleProfile
} from '../types';
import { UI_TEXT } from '../i18n';

interface RoutePlannerPanelProps {
  nodes: RoadNode[];
  vehicleProfiles: VehicleProfile[];
  routeResult: RouteResponse | null;
  lang: Language;
  initialOriginId?: string;
  initialDestId?: string;
  onComputeRoute: (originId: string, destId: string, vehicleId: string) => Promise<void>;
  onClearRoute: () => void;
}

const POPULAR_SYLHET_TRIPS = [
  {
    label: 'Bandar Bazar → Humayun Rashid / Station',
    origin: 'bandarbazar',
    dest: 'humayun_rashid',
    vehicle: 'cng'
  },
  {
    label: 'Zindabazar → SUST Main Gate',
    origin: 'zindabazar',
    dest: 'sust_gate',
    vehicle: 'cng'
  },
  {
    label: 'Mirabazar → Osmani Medical',
    origin: 'mirabazar',
    dest: 'osmani_medical',
    vehicle: 'suv_ambulance'
  },
  {
    label: 'Naiorpul → Tilagor (MC College)',
    origin: 'naiorpul',
    dest: 'tilagor',
    vehicle: 'rickshaw'
  }
];

export const RoutePlannerPanel: React.FC<RoutePlannerPanelProps> = ({
  nodes,
  vehicleProfiles,
  routeResult,
  lang,
  initialOriginId,
  initialDestId,
  onComputeRoute,
  onClearRoute
}) => {
  const t = UI_TEXT[lang];
  const [originId, setOriginId] = useState<string>(initialOriginId || 'bandarbazar');
  const [destId, setDestId] = useState<string>(initialDestId || 'humayun_rashid');
  const [vehicleId, setVehicleId] = useState<string>('cng');
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    if (initialOriginId) setOriginId(initialOriginId);
    if (initialDestId) setDestId(initialDestId);
  }, [initialOriginId, initialDestId]);

  // Auto-calculate initial route when opened if none exists
  useEffect(() => {
    if (!routeResult && nodes.length > 0) {
      onComputeRoute(originId, destId, vehicleId).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length]);

  const triggerCompute = async (o: string, d: string, v: string) => {
    if (o === d) {
      setErr('Please choose different Origin and Destination points.');
      return;
    }
    setErr('');
    setLoading(true);
    try {
      await onComputeRoute(o, d, v);
    } catch (e: any) {
      setErr(e?.message || 'Could not compute route');
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = () => {
    const nextO = destId;
    const nextD = originId;
    setOriginId(nextO);
    setDestId(nextD);
    triggerCompute(nextO, nextD, vehicleId);
  };

  const handleVehicleSelect = (vId: string) => {
    setVehicleId(vId);
    triggerCompute(originId, destId, vId);
  };

  const handlePresetTrip = (p: (typeof POPULAR_SYLHET_TRIPS)[number]) => {
    setOriginId(p.origin);
    setDestId(p.dest);
    setVehicleId(p.vehicle);
    triggerCompute(p.origin, p.dest, p.vehicle);
  };

  const safe = routeResult?.safeRoute;
  const std = routeResult?.standardRoute;

  return (
    <aside className="w-full h-full flex flex-col bg-[#08121e] border-r border-slate-800/90 overflow-y-auto">
      <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-900/40">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
            <Navigation className="w-4 h-4 text-cyan-400" />
            <span>{t.routePlannerTitle}</span>
          </h2>
          {routeResult && (
            <button
              onClick={onClearRoute}
              className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
            >
              Clear Map
            </button>
          )}
        </div>

        {/* Quick Sylhet Commuter Presets */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" /> Quick Sylhet Corridor Checks
          </span>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_SYLHET_TRIPS.map((p) => (
              <button
                key={p.label}
                onClick={() => handlePresetTrip(p)}
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[10px] font-semibold text-cyan-200 transition cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Origin & Destination Selectors */}
        <div className="space-y-2 relative">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              A • {t.originLabel}
            </label>
            <select
              value={originId}
              onChange={(e) => {
                setOriginId(e.target.value);
                triggerCompute(e.target.value, destId, vehicleId);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
            >
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {lang === 'bn' ? n.nameBn : n.name} ({n.ward})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-center -my-1">
            <button
              type="button"
              onClick={handleSwap}
              className="p-1.5 rounded-full bg-slate-800 hover:bg-cyan-500/25 border border-slate-700 text-cyan-300 transition cursor-pointer"
              title="Swap Origin & Destination"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              B • {t.destLabel}
            </label>
            <select
              value={destId}
              onChange={(e) => {
                setDestId(e.target.value);
                triggerCompute(originId, e.target.value, vehicleId);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
            >
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {lang === 'bn' ? n.nameBn : n.name} ({n.ward})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Vehicle Profile Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 block">
            {t.selectVehicle}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {vehicleProfiles.map((v) => {
              const active = vehicleId === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleVehicleSelect(v.id)}
                  className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                    active
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100 shadow-sm'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="text-[11px] font-bold truncate">
                    {lang === 'bn' ? v.nameBn : v.name}
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono-num">
                    Safe ≤ {v.maxSafeDepthCm}cm
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {err && (
          <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-200 text-xs">
            {err}
          </div>
        )}

        <button
          onClick={() => triggerCompute(originId, destId, vehicleId)}
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-extrabold text-xs shadow-lg transition cursor-pointer"
        >
          {loading ? 'Analyzing Sylhet Road Hazards...' : t.calculateRoute}
        </button>
      </div>

      {/* Route Analysis Output */}
      {safe && std && routeResult && (
        <div className="p-4 space-y-4">
          {/* Verdict Card */}
          <div
            className={`p-3.5 rounded-2xl border space-y-2 ${
              safe.status === 'safe'
                ? 'bg-emerald-950/35 border-emerald-500/45'
                : safe.status === 'caution'
                ? 'bg-amber-950/35 border-amber-500/45'
                : 'bg-red-950/40 border-red-500/50'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {safe.status === 'safe' ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : safe.status === 'caution' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                )}
                <div>
                  <div className="text-xs font-extrabold text-white uppercase tracking-wide">
                    {safe.status === 'safe'
                      ? 'Passable Safe Route Found'
                      : safe.status === 'caution'
                      ? 'Passable With Caution'
                      : 'Severe Submergence — Delay Travel!'}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    For <b>{routeResult.vehicle.name}</b> (Safe clearance ≤{' '}
                    {routeResult.vehicle.maxSafeDepthCm}cm)
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] text-slate-400">Distance</div>
                <div className="text-sm font-extrabold font-mono-num text-white">
                  {safe.totalKm} km
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> Est. Time
                </div>
                <div className="text-sm font-extrabold font-mono-num text-cyan-300">
                  {safe.estimatedMinutes} min
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                  <Droplets className="w-2.5 h-2.5" /> Max Water
                </div>
                <div
                  className={`text-sm font-extrabold font-mono-num ${
                    safe.maxWaterDepthCm > routeResult.vehicle.maxSafeDepthCm
                      ? 'text-amber-300'
                      : 'text-emerald-300'
                  }`}
                >
                  {safe.maxWaterDepthCm} cm
                </div>
              </div>
            </div>

            {!routeResult.vehicle.keaneBridgeAllowed && (
              <div className="text-[10px] text-sky-300 bg-sky-950/40 border border-sky-500/30 rounded-lg px-2.5 py-1">
                ℹ️ Keane Bridge restriction applied: Motor vehicles automatically routed via{' '}
                <b>Kazir Bazar Bridge</b> or <b>Shahjalal Bridge</b>.
              </div>
            )}
          </div>

          {/* Detour Comparison if Standard Shortcut was Flooded */}
          {!routeResult.samePath && (
            <div className="p-3 rounded-xl bg-red-950/25 border border-red-500/35 space-y-1.5 text-xs">
              <div className="font-bold text-red-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Avoided Flooded Standard Shortcut ({std.maxWaterDepthCm}cm Peak Depth)</span>
              </div>
              <p className="text-[11px] text-slate-300">
                The normal {std.totalKm} km route encounters{' '}
                <b>{routeResult.avoidedHazards.length} active hazard(s)</b>:
              </p>
              <ul className="space-y-1 pt-0.5">
                {routeResult.avoidedHazards.map((h) => (
                  <li
                    key={h.id}
                    className="text-[11px] text-red-200 flex items-center justify-between bg-red-950/40 px-2 py-1 rounded-md"
                  >
                    <span className="truncate">{h.areaName}</span>
                    <span className="font-mono-num font-bold shrink-0 ml-2">
                      {h.waterDepthCm > 0 ? `${h.waterDepthCm}cm` : h.category}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Turn-by-Turn Sylhet Road Segments */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <RouteIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Turn-by-Turn Corridor Breakdown ({safe.steps.length} segments)</span>
            </h3>

            <div className="space-y-1.5">
              {safe.steps.map((step, idx) => (
                <div
                  key={`${step.road}-${idx}`}
                  className="p-2.5 rounded-xl bg-slate-900/75 border border-slate-800 text-xs flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-100 truncate">
                      {idx + 1}. {lang === 'bn' ? step.roadBn : step.road}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {lang === 'bn' ? step.fromNameBn : step.fromName} →{' '}
                      {lang === 'bn' ? step.toNameBn : step.toName}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono-num text-[11px] text-slate-300">
                      {step.km} km • {step.minutes}m
                    </div>
                    <span
                      className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        step.status === 'safe'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : step.status === 'caution'
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {step.maxDepthCm > 0 ? `${step.maxDepthCm}cm water` : 'Clear'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
