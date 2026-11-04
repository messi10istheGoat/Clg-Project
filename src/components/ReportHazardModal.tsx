import React, { useEffect, useState } from 'react';
import {
  X,
  MapPin,
  Camera,
  Crosshair,
  Droplets,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import {
  HazardCategory,
  HazardSeverity,
  Language,
  RoadNode
} from '../types';
import { CATEGORY_META, describeWaterDepth } from '../i18n';
import { CreateReportInput } from '../services/api';

interface ReportHazardModalProps {
  isOpen: boolean;
  nodes: RoadNode[];
  pickedCoords: { lat: number; lng: number } | null;
  lang: Language;
  isAdminMode: boolean;
  onClose: () => void;
  onStartMapPick: () => void;
  onSubmit: (data: CreateReportInput) => Promise<void>;
}

function findNearestNode(lat: number, lng: number, nodes: RoadNode[]): RoadNode | null {
  let best: RoadNode | null = null;
  let bestDist = Infinity;
  for (const n of nodes) {
    const d = Math.hypot(n.lat - lat, n.lng - lng);
    if (d < bestDist) {
      bestDist = d;
      best = n;
    }
  }
  return best;
}

export const ReportHazardModal: React.FC<ReportHazardModalProps> = ({
  isOpen,
  nodes,
  pickedCoords,
  lang,
  isAdminMode,
  onClose,
  onStartMapPick,
  onSubmit
}) => {
  const [category, setCategory] = useState<HazardCategory>('waterlogging');
  const [waterDepthCm, setWaterDepthCm] = useState<number>(28);
  const [severity, setSeverity] = useState<HazardSeverity>('high');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('zindabazar');
  const [lat, setLat] = useState<number>(24.8948);
  const [lng, setLng] = useState<number>(91.8688);
  const [areaName, setAreaName] = useState<string>('Zindabazar Point');
  const [ward, setWard] = useState<string>('Ward 2');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [reporterName, setReporterName] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Sync coordinates when user clicks a pin on the map
  useEffect(() => {
    if (pickedCoords) {
      setLat(pickedCoords.lat);
      setLng(pickedCoords.lng);
      const nearest = findNearestNode(pickedCoords.lat, pickedCoords.lng, nodes);
      if (nearest) {
        setSelectedPresetId('custom');
        setAreaName(`Near ${nearest.name}`);
        setWard(nearest.ward);
      }
    }
  }, [pickedCoords, nodes]);

  // Auto-suggest severity when depth or category changes
  const handleDepthChange = (cm: number) => {
    setWaterDepthCm(cm);
    if (category === 'open_manhole') {
      setSeverity('critical');
    } else if (cm >= 42) {
      setSeverity('critical');
    } else if (cm >= 25) {
      setSeverity('high');
    } else if (cm >= 12) {
      setSeverity('moderate');
    } else {
      setSeverity('low');
    }
  };

  const handleCategorySelect = (cat: HazardCategory) => {
    setCategory(cat);
    if (cat === 'open_manhole') {
      setSeverity('critical');
    } else if (cat !== 'waterlogging' && waterDepthCm > 15) {
      setWaterDepthCm(10);
      setSeverity('high');
    }
  };

  const handlePresetChange = (nodeId: string) => {
    setSelectedPresetId(nodeId);
    const found = nodes.find((n) => n.id === nodeId);
    if (found) {
      setLat(found.lat);
      setLng(found.lng);
      setAreaName(found.name);
      setWard(found.ward);
    }
  };

  const handleUseGps = () => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const gLat = Number(pos.coords.latitude.toFixed(5));
        const gLng = Number(pos.coords.longitude.toFixed(5));
        if (gLat >= 24.75 && gLat <= 25.05 && gLng >= 91.70 && gLng <= 92.05) {
          setLat(gLat);
          setLng(gLng);
          const nearest = findNearestNode(gLat, gLng, nodes);
          if (nearest) {
            setAreaName(`Near ${nearest.name}`);
            setWard(nearest.ward);
          }
          setSelectedPresetId('custom');
        } else {
          setError('Your GPS is outside Sylhet bounds — please select a Sylhet landmark or pick on map.');
        }
      },
      () => {
        setError('Unable to read GPS — select a Sylhet location or click "Pick Spot on Map".');
      }
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 720;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, w, h);
        setPhotoUrl(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const autoTitle =
      title.trim() ||
      `${CATEGORY_META[category].shortEn} at ${areaName}${
        waterDepthCm > 0 ? ` (${waterDepthCm}cm)` : ''
      }`;

    setSubmitting(true);
    try {
      await onSubmit({
        title: autoTitle,
        category,
        severity,
        waterDepthCm,
        ward,
        areaName,
        lat,
        lng,
        description:
          description.trim() ||
          `Reported ${CATEGORY_META[category].labelEn.toLowerCase()} near ${areaName} (${ward}).`,
        reporterName: reporterName.trim() || (isAdminMode ? 'SCC Field Inspector' : 'Sylhet Citizen'),
        photoUrl,
        verifiedOfficial: isAdminMode
      });
      setTitle('');
      setDescription('');
      setPhotoUrl('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-[#091422] border border-slate-700/90 shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-cyan-400" />
              <span>
                {lang === 'bn'
                  ? 'নতুন জলাবদ্ধতা বা সড়ক ঝুঁকি রিপোর্ট করুন'
                  : 'Report Waterlogging or Road Hazard'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Instant live broadcast to Sylhet commuters &amp; SCC drainage monitor
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-200 text-xs">
              {error}
            </div>
          )}

          {/* 1. Hazard Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              1. Hazard Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(CATEGORY_META) as HazardCategory[]).map((catKey) => {
                const meta = CATEGORY_META[catKey];
                const selected = category === catKey;
                return (
                  <button
                    type="button"
                    key={catKey}
                    onClick={() => handleCategorySelect(catKey)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition cursor-pointer ${
                      selected
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100 shadow-md'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>{meta.shortEn}</div>
                    <div className="text-[10px] font-normal text-slate-400 truncate">
                      {meta.labelBn}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Location Selection */}
          <div className="space-y-2 p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                2. Location in Sylhet
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onStartMapPick}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <MapPin className="w-3 h-3" />
                  <span>Pick Exact Spot on Map</span>
                </button>
                <button
                  type="button"
                  onClick={handleUseGps}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Crosshair className="w-3 h-3" /> GPS
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Nearest Junction / Area</span>
                <select
                  value={selectedPresetId}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="custom">📍 Custom Map Pin ({lat.toFixed(4)}, {lng.toFixed(4)})</option>
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({n.ward})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Specific Street / Spot Label</span>
                <input
                  type="text"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  placeholder="e.g. Opposite Blue Water Mall"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="text-[11px] text-slate-400 font-mono-num flex items-center justify-between pt-0.5">
              <span>
                Coords: {lat.toFixed(5)}°N, {lng.toFixed(5)}°E
              </span>
              <span>{ward}</span>
            </div>
          </div>

          {/* 3. Water Depth & Severity */}
          <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-cyan-400" />
                3. Estimated Water Depth
              </label>
              <span className="text-xs font-extrabold font-mono-num text-cyan-300">
                {describeWaterDepth(waterDepthCm, lang)}
              </span>
            </div>

            <input
              type="range"
              min={0}
              max={90}
              step={2}
              value={waterDepthCm}
              onChange={(e) => handleDepthChange(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />

            <div className="flex flex-wrap gap-1.5">
              {[
                { cm: 0, label: '0cm (Dry)' },
                { cm: 12, label: '12cm (Ankle)' },
                { cm: 26, label: '26cm (CNG Risk)' },
                { cm: 42, label: '42cm (Knee)' },
                { cm: 60, label: '60cm (Waist+)' }
              ].map((preset) => (
                <button
                  type="button"
                  key={preset.cm}
                  onClick={() => handleDepthChange(preset.cm)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold border cursor-pointer ${
                    waterDepthCm === preset.cm
                      ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="pt-1 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400">Severity Rating:</span>
              <div className="flex gap-1.5">
                {(['low', 'moderate', 'high', 'critical'] as HazardSeverity[]).map((sev) => (
                  <button
                    type="button"
                    key={sev}
                    onClick={() => setSeverity(sev)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize border cursor-pointer ${
                      severity === sev
                        ? sev === 'critical'
                          ? 'bg-red-500/25 border-red-400 text-red-200'
                          : sev === 'high'
                          ? 'bg-orange-500/25 border-orange-400 text-orange-200'
                          : sev === 'moderate'
                          ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                          : 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Headline, Notes & Photo */}
          <div className="space-y-2.5">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short Headline (auto-generated if left blank, e.g. Knee-deep water at Naiorpul)"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/90 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
            />

            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details: Which lane is affected? Are CNGs or rickshaws able to pass? Any open drain nearby?"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/90 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="Your Name (Optional — defaults to Citizen)"
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/90 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
              />

              <label className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-dashed border-slate-700 text-xs text-slate-300 cursor-pointer transition">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>{photoUrl ? 'Photo Attached ✓ (Change)' : 'Attach Scene Photo (Optional)'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {photoUrl && (
              <div className="relative rounded-xl overflow-hidden border border-slate-700 h-28">
                <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Publishing...' : 'Publish Live Alert'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
