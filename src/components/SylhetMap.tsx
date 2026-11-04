import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Layers,
  Crosshair,
  Sun,
  Moon,
  Map as MapIcon,
  MapPin,
  X
} from 'lucide-react';
import {
  GeoStaticData,
  HazardCategory,
  HazardReport,
  Language,
  MapLayerVisibility,
  MapStyleId,
  RouteResponse
} from '../types';
import { SEVERITY_META, UI_TEXT } from '../i18n';

interface SylhetMapProps {
  reports: HazardReport[];
  geo: GeoStaticData | null;
  selectedReportId: string | null;
  onSelectReport: (report: HazardReport) => void;
  routeResult: RouteResponse | null;
  pinPickMode: boolean;
  pickedCoords: { lat: number; lng: number } | null;
  onMapPickCoords: (coords: { lat: number; lng: number }) => void;
  onCancelPinPick: () => void;
  flyToTarget: { lat: number; lng: number; zoom?: number; ts: number } | null;
  lang: Language;
}

const TILE_URLS: Record<MapStyleId, { url: string; attribution: string }> = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  },
  voyager: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors'
  }
};

function getCategorySvgGlyph(cat: HazardCategory): string {
  switch (cat) {
    case 'waterlogging':
      return `<path d="M3 15c2.5-2 5-2 7.5 0s5 2 7.5 0 3-1.5 3-1.5M3 19c2.5-2 5-2 7.5 0s5 2 7.5 0 3-1.5 3-1.5M12 4C9.5 7.5 8 9.8 8 11.5a4 4 0 0 0 8 0C16 9.8 14.5 7.5 12 4z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    case 'open_manhole':
      return `<circle cx="12" cy="12" r="8" stroke="white" stroke-width="2" fill="none"/><path d="M12 8v4m0 4h.01" stroke="white" stroke-width="2.4" stroke-linecap="round"/>`;
    case 'pothole':
      return `<path d="M3 16l4-3 3 2 4-4 3 3 4-2v5H3z" stroke="white" stroke-width="1.9" stroke-linejoin="round" fill="none"/>`;
    case 'road_construction':
      return `<path d="M9 4h6l3 14H6L9 4zm-4 14h14M8 10h8M7 14h10" stroke="white" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    case 'fallen_tree':
      return `<path d="M12 3L5 13h5l-2 8 11-11h-5l3-7z" stroke="white" stroke-width="1.9" stroke-linejoin="round" fill="none"/>`;
    default:
      return `<rect x="5" y="8" width="14" height="9" rx="2" stroke="white" stroke-width="2" fill="none"/><circle cx="8.5" cy="17" r="1.5" fill="white"/><circle cx="15.5" cy="17" r="1.5" fill="white"/>`;
  }
}

function createHazardDivIcon(report: HazardReport, isSelected: boolean): L.DivIcon {
  const isResolved = report.status === 'resolved';
  const sev = SEVERITY_META[report.severity] || SEVERITY_META.moderate;
  const color = isResolved ? '#10b981' : sev.hex;
  const showPulse = !isResolved && (report.severity === 'critical' || report.severity === 'high');
  const scale = isSelected ? 'scale(1.18)' : 'scale(1)';

  const depthBadge =
    report.waterDepthCm > 0 && !isResolved
      ? `<span style="position:absolute;bottom:-9px;left:50%;transform:translateX(-50%);background:#08121e;color:#f8fafc;border:1px solid ${color};border-radius:6px;padding:0px 4px;font-size:9px;font-weight:800;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.6);">${report.waterDepthCm}cm</span>`
      : '';

  const verifiedTick = report.verifiedOfficial
    ? `<span style="position:absolute;top:-4px;right:-4px;width:14px;height:14px;border-radius:999px;background:#38bdf8;color:#041019;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;border:1.5px solid #08121e;">✓</span>`
    : '';

  const html = `
    <div style="position:relative;width:38px;height:38px;display:flex;align-items:center;justify-content:center;transform:${scale};transition:transform 0.18s ease;">
      ${
        showPulse
          ? `<span class="hazard-pulse-ring" style="position:absolute;inset:0;border-radius:9999px;background:${sev.ringHex};"></span>`
          : ''
      }
      <div style="position:relative;width:32px;height:32px;border-radius:9999px;background:${color};border:${
    isSelected ? '3px solid #ffffff' : '2px solid #08121e'
  };box-shadow:0 6px 16px rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;">
        <svg viewBox="0 0 24 24" width="17" height="17">${getCategorySvgGlyph(report.category)}</svg>
        ${verifiedTick}
      </div>
      ${depthBadge}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'sylhet-custom-pin',
    iconSize: [38, 44],
    iconAnchor: [19, 22]
  });
}

export const SylhetMap: React.FC<SylhetMapProps> = ({
  reports,
  geo,
  selectedReportId,
  onSelectReport,
  routeResult,
  pinPickMode,
  pickedCoords,
  onMapPickCoords,
  onCancelPinPick,
  flyToTarget,
  lang
}) => {
  const t = UI_TEXT[lang];
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const zonesGroupRef = useRef<L.LayerGroup | null>(null);
  const hydroGroupRef = useRef<L.LayerGroup | null>(null);
  const roadsGroupRef = useRef<L.LayerGroup | null>(null);
  const sheltersGroupRef = useRef<L.LayerGroup | null>(null);
  const reportsGroupRef = useRef<L.LayerGroup | null>(null);
  const routeGroupRef = useRef<L.LayerGroup | null>(null);
  const pickedMarkerRef = useRef<L.Marker | null>(null);

  const [mapStyle, setMapStyle] = useState<MapStyleId>('dark');
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);
  const [layers, setLayers] = useState<MapLayerVisibility>({
    reports: true,
    floodZones: true,
    hydroNetwork: true,
    roadGraph: false,
    shelters: true
  });

  // Keep latest callback ref for click handler
  const pinPickRef = useRef({ pinPickMode, onMapPickCoords });
  pinPickRef.current = { pinPickMode, onMapPickCoords };

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [24.8958, 91.8688],
      zoom: 14,
      minZoom: 12,
      maxZoom: 18,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const tileCfg = TILE_URLS.dark;
    const tile = L.tileLayer(tileCfg.url, {
      attribution: tileCfg.attribution,
      maxZoom: 19
    }).addTo(map);
    tileLayerRef.current = tile;

    zonesGroupRef.current = L.layerGroup().addTo(map);
    hydroGroupRef.current = L.layerGroup().addTo(map);
    roadsGroupRef.current = L.layerGroup().addTo(map);
    sheltersGroupRef.current = L.layerGroup().addTo(map);
    routeGroupRef.current = L.layerGroup().addTo(map);
    reportsGroupRef.current = L.layerGroup().addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (pinPickRef.current.pinPickMode) {
        pinPickRef.current.onMapPickCoords({
          lat: Number(e.latlng.lat.toFixed(5)),
          lng: Number(e.latlng.lng.toFixed(5))
        });
      }
    });

    mapRef.current = map;

    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Switch Base Tile Style
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const cfg = TILE_URLS[mapStyle];
    tileLayerRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: 19
    }).addTo(map);
  }, [mapStyle]);

  // Fly to target when requested
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyToTarget) return;
    map.flyTo([flyToTarget.lat, flyToTarget.lng], flyToTarget.zoom || 16, {
      duration: 0.85
    });
  }, [flyToTarget]);

  // Render Flood Risk Zones, Surma/Charas, Road Network & Emergency Shelters
  useEffect(() => {
    const zonesGroup = zonesGroupRef.current;
    const hydroGroup = hydroGroupRef.current;
    const roadsGroup = roadsGroupRef.current;
    const sheltersGroup = sheltersGroupRef.current;
    if (!zonesGroup || !hydroGroup || !roadsGroup || !sheltersGroup) return;

    zonesGroup.clearLayers();
    hydroGroup.clearLayers();
    roadsGroup.clearLayers();
    sheltersGroup.clearLayers();

    if (!geo) return;

    // 1. Flood Risk Zones
    if (layers.floodZones) {
      for (const z of geo.floodZones) {
        const fillColor =
          z.riskLevel === 'critical' ? '#ef4444' : z.riskLevel === 'high' ? '#f97316' : '#eab308';
        const poly = L.polygon(z.polygon, {
          color: fillColor,
          weight: 1.5,
          dashArray: '5, 5',
          fillColor,
          fillOpacity: 0.12
        });
        poly.bindPopup(`
          <div style="min-width:190px;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:${fillColor};font-weight:700;">
              Flood Basin • ${z.ward}
            </div>
            <div style="font-weight:700;font-size:13px;margin-top:2px;">
              ${lang === 'bn' ? z.nameBn : z.name}
            </div>
            <div style="font-size:11px;color:#cbd5e1;margin-top:4px;">
              ${z.summary}
            </div>
            <div style="font-size:10px;color:#94a3b8;margin-top:5px;">
              Avg Ground Elevation: <b>${z.avgElevationM}m MSL</b>
            </div>
          </div>
        `);
        poly.addTo(zonesGroup);
      }
    }

    // 2. Surma River & Natural Chara Channels
    if (layers.hydroNetwork) {
      for (const ch of geo.hydroChannels) {
        const isRiver = ch.type === 'river';
        const color = isRiver
          ? '#0284c7'
          : ch.status === 'critical_blockage'
          ? '#f43f5e'
          : '#38bdf8';
        const line = L.polyline(ch.coords, {
          color,
          weight: isRiver ? 7 : 3.2,
          opacity: isRiver ? 0.65 : 0.85,
          dashArray: isRiver ? undefined : '6, 5'
        });
        line.bindPopup(`
          <div style="min-width:185px;">
            <div style="font-size:10px;font-weight:700;color:#38bdf8;text-transform:uppercase;">
              ${isRiver ? 'Major River' : 'Natural Chara / Storm Canal'}
            </div>
            <div style="font-weight:700;font-size:13px;margin-top:2px;">
              ${lang === 'bn' ? ch.nameBn : ch.name}
            </div>
            <div style="font-size:11px;color:#e2e8f0;margin-top:4px;">
              ${ch.statusNote}
            </div>
          </div>
        `);
        line.addTo(hydroGroup);
      }
    }

    // 3. Sylhet Arterial Road Network Overlay
    if (layers.roadGraph) {
      const nodeMap = new Map(geo.nodes.map((n) => [n.id, n]));
      for (const e of geo.edges) {
        const a = nodeMap.get(e.from);
        const b = nodeMap.get(e.to);
        if (!a || !b) continue;
        L.polyline(
          [
            [a.lat, a.lng],
            [b.lat, b.lng]
          ],
          {
            color: e.isKeaneBridge ? '#f59e0b' : '#64748b',
            weight: 2.2,
            opacity: 0.65,
            dashArray: e.isKeaneBridge ? '4, 4' : undefined
          }
        ).addTo(roadsGroup);
      }
      for (const n of geo.nodes) {
        const dot = L.circleMarker([n.lat, n.lng], {
          radius: 4,
          color: '#38bdf8',
          fillColor: '#0f172a',
          fillOpacity: 1,
          weight: 1.8
        });
        dot.bindTooltip(lang === 'bn' ? n.nameBn : n.name, {
          direction: 'top',
          className: 'sylhet-node-tooltip'
        });
        dot.addTo(roadsGroup);
      }
    }

    // 4. Emergency Facilities & Flood Shelters
    if (layers.shelters) {
      for (const fac of geo.emergencyFacilities) {
        const bg =
          fac.type === 'hospital'
            ? '#e11d48'
            : fac.type === 'shelter'
            ? '#10b981'
            : fac.type === 'fire_rescue'
            ? '#f97316'
            : '#0ea5e9';
        const labelChar =
          fac.type === 'hospital'
            ? 'H'
            : fac.type === 'shelter'
            ? 'S'
            : fac.type === 'fire_rescue'
            ? 'F'
            : 'C';

        const icon = L.divIcon({
          className: 'sylhet-custom-pin',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          html: `<div style="width:22px;height:22px;border-radius:6px;background:${bg};border:2px solid #08121e;color:#fff;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.5);">${labelChar}</div>`
        });

        const marker = L.marker([fac.lat, fac.lng], { icon });
        marker.bindPopup(`
          <div style="min-width:195px;">
            <div style="font-size:10px;font-weight:700;color:${bg};text-transform:uppercase;">
              ${fac.type.replace('_', ' ')} • ${fac.ward}
            </div>
            <div style="font-weight:700;font-size:13px;margin-top:2px;">
              ${lang === 'bn' ? fac.nameBn : fac.name}
            </div>
            <div style="font-size:11px;color:#cbd5e1;margin-top:4px;">${fac.capacity}</div>
            <div style="margin-top:6px;font-size:11px;font-weight:700;color:#38bdf8;">
              ☎ ${fac.phone}
            </div>
          </div>
        `);
        marker.addTo(sheltersGroup);
      }
    }
  }, [geo, layers, lang]);

  // Render Hazard Markers
  useEffect(() => {
    const group = reportsGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!layers.reports) return;

    for (const rpt of reports) {
      const isSelected = rpt.id === selectedReportId;
      const marker = L.marker([rpt.lat, rpt.lng], {
        icon: createHazardDivIcon(rpt, isSelected),
        zIndexOffset: isSelected ? 900 : rpt.severity === 'critical' ? 500 : 100
      });

      marker.on('click', () => {
        onSelectReport(rpt);
      });

      marker.bindTooltip(
        `${lang === 'bn' && rpt.titleBn ? rpt.titleBn : rpt.title} (${
          rpt.waterDepthCm > 0 ? `${rpt.waterDepthCm}cm` : rpt.severity
        })`,
        {
          direction: 'top',
          offset: [0, -14],
          className: 'sylhet-node-tooltip'
        }
      );

      marker.addTo(group);
    }
  }, [reports, selectedReportId, layers.reports, onSelectReport, lang]);

  // Render Safe Route vs Flooded Standard Route Polylines
  useEffect(() => {
    const group = routeGroupRef.current;
    const map = mapRef.current;
    if (!group || !map) return;
    group.clearLayers();

    if (!routeResult || !routeResult.ok) return;

    const { standardRoute, safeRoute, samePath } = routeResult;

    // Draw standard route in red dashed if a safer detour was chosen
    if (!samePath && standardRoute.coordinates.length > 1) {
      const riskyLine = L.polyline(standardRoute.coordinates, {
        color: '#ef4444',
        weight: 5,
        opacity: 0.78,
        dashArray: '8, 10'
      });
      riskyLine.bindTooltip('Avoided Flooded / High-Risk Shortcut', {
        sticky: true,
        className: 'sylhet-node-tooltip'
      });
      riskyLine.addTo(group);
    }

    // Draw Recommended Safe Route
    if (safeRoute.coordinates.length > 1) {
      const safeGlowColor =
        safeRoute.status === 'impassable'
          ? '#f97316'
          : safeRoute.status === 'caution'
          ? '#facc15'
          : '#10b981';

      // Outer halo
      L.polyline(safeRoute.coordinates, {
        color: safeGlowColor,
        weight: 11,
        opacity: 0.25
      }).addTo(group);

      // Inner crisp line
      const mainLine = L.polyline(safeRoute.coordinates, {
        color: safeGlowColor,
        weight: 5.5,
        opacity: 0.98
      });
      mainLine.bindTooltip(
        `${lang === 'bn' ? 'প্রস্তাবিত রুট' : 'Recommended Route'}: ${safeRoute.totalKm} km • ${
          safeRoute.estimatedMinutes
        } min`,
        { sticky: true, className: 'sylhet-node-tooltip' }
      );
      mainLine.addTo(group);

      // Origin & Destination Pins
      const startPin = L.divIcon({
        className: 'sylhet-custom-pin',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        html: `<div style="width:28px;height:28px;border-radius:999px;background:#0ea5e9;border:3px solid #ffffff;color:#041019;font-weight:900;font-size:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.6);">A</div>`
      });
      const endPin = L.divIcon({
        className: 'sylhet-custom-pin',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        html: `<div style="width:28px;height:28px;border-radius:999px;background:#10b981;border:3px solid #ffffff;color:#041019;font-weight:900;font-size:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.6);">B</div>`
      });

      L.marker([safeRoute.origin.lat, safeRoute.origin.lng], { icon: startPin, zIndexOffset: 1000 })
        .bindTooltip(`Start: ${safeRoute.origin.name}`, { className: 'sylhet-node-tooltip' })
        .addTo(group);

      L.marker(
        [safeRoute.destination.lat, safeRoute.destination.lng],
        { icon: endPin, zIndexOffset: 1000 }
      )
        .bindTooltip(`Destination: ${safeRoute.destination.name}`, {
          className: 'sylhet-node-tooltip'
        })
        .addTo(group);

      const allCoords = [
        ...safeRoute.coordinates,
        ...(!samePath ? standardRoute.coordinates : [])
      ];
      map.fitBounds(L.latLngBounds(allCoords), { padding: [55, 55], maxZoom: 15 });
    }
  }, [routeResult, lang]);

  // Render Picked Coordinate Pin during Report Placement
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (pickedMarkerRef.current) {
      map.removeLayer(pickedMarkerRef.current);
      pickedMarkerRef.current = null;
    }

    if (pickedCoords) {
      const icon = L.divIcon({
        className: 'sylhet-custom-pin',
        iconSize: [36, 36],
        iconAnchor: [18, 34],
        html: `<div style="width:34px;height:34px;border-radius:999px 999px 999px 0;transform:rotate(-45deg);background:#22d3ee;border:3px solid #ffffff;box-shadow:0 8px 20px rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-weight:900;color:#041019;font-size:15px;">+</span></div>`
      });
      pickedMarkerRef.current = L.marker([pickedCoords.lat, pickedCoords.lng], {
        icon,
        zIndexOffset: 1200
      }).addTo(map);
    }
  }, [pickedCoords]);

  const handleLocateUserOrCenter = () => {
    const map = mapRef.current;
    if (!map) return;
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          // If user is physically inside Greater Sylhet, fly to their GPS; otherwise center on Zindabazar
          if (latitude >= 24.75 && latitude <= 25.05 && longitude >= 91.70 && longitude <= 92.05) {
            map.flyTo([latitude, longitude], 16, { duration: 0.9 });
          } else {
            map.flyTo([24.8958, 91.8688], 14, { duration: 0.9 });
          }
        },
        () => {
          map.flyTo([24.8958, 91.8688], 14, { duration: 0.8 });
        },
        { timeout: 3500 }
      );
    } else {
      map.flyTo([24.8958, 91.8688], 14, { duration: 0.8 });
    }
  };

  const toggleLayer = (key: keyof MapLayerVisibility) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div
      className={`relative w-full h-full select-none ${
        pinPickMode ? 'cursor-crosshair' : ''
      }`}
    >
      {/* Leaflet Canvas */}
      <div ref={containerRef} className="w-full h-full z-0" />

      {/* Pin Placement Floating Instruction Banner */}
      {pinPickMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[600] flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-cyan-950/95 border border-cyan-400/60 text-cyan-100 shadow-2xl backdrop-blur-md">
          <MapPin className="w-4 h-4 text-cyan-300 animate-bounce shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{t.pickOnMapPrompt}</span>
          <button
            onClick={onCancelPinPick}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>{t.cancelPin}</span>
          </button>
        </div>
      )}

      {/* Top-Right Floating Map HUD Controls */}
      <div className="absolute top-3 right-3 z-[500] flex flex-col items-end gap-2">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#091422]/92 border border-slate-700/80 backdrop-blur-md shadow-xl">
          <button
            onClick={() => setMapStyle('dark')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
              mapStyle === 'dark'
                ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Dark Command Map"
          >
            <Moon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dark</span>
          </button>
          <button
            onClick={() => setMapStyle('voyager')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
              mapStyle === 'voyager'
                ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Daylight Street Map"
          >
            <Sun className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Street</span>
          </button>
          <button
            onClick={() => setMapStyle('osm')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
              mapStyle === 'osm'
                ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Detailed OpenStreetMap"
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">OSM</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLocateUserOrCenter}
            className="p-2.5 rounded-xl bg-[#091422]/92 hover:bg-slate-800 border border-slate-700/80 text-slate-200 shadow-xl backdrop-blur-md transition cursor-pointer"
            title="Center on Sylhet / My GPS"
          >
            <Crosshair className="w-4 h-4 text-cyan-400" />
          </button>

          <button
            onClick={() => setLayerMenuOpen((o) => !o)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold shadow-xl backdrop-blur-md transition cursor-pointer ${
              layerMenuOpen
                ? 'bg-cyan-950/95 border-cyan-400/50 text-cyan-200'
                : 'bg-[#091422]/92 border-slate-700/80 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>{t.mapLayers}</span>
          </button>
        </div>

        {/* Layer Toggle Popover */}
        {layerMenuOpen && (
          <div className="w-60 p-3 rounded-2xl bg-[#091422]/96 border border-slate-700/90 shadow-2xl backdrop-blur-xl text-xs space-y-2">
            <div className="font-bold text-slate-300 uppercase tracking-wider text-[10px] pb-1 border-b border-slate-800">
              GIS Overlay Layers
            </div>
            {[
              { key: 'reports' as const, label: 'Hazard Pins & Depth Badges', dot: 'bg-red-400' },
              { key: 'floodZones' as const, label: 'Flood-Prone Basin Zones', dot: 'bg-orange-400' },
              { key: 'hydroNetwork' as const, label: 'Surma River & Charas', dot: 'bg-sky-400' },
              { key: 'shelters' as const, label: 'Shelters, Hospitals & Fire HQ', dot: 'bg-emerald-400' },
              { key: 'roadGraph' as const, label: 'Sylhet Arterial Road Graph', dot: 'bg-slate-400' }
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-slate-800/60 cursor-pointer"
              >
                <span className="flex items-center gap-2 text-slate-200">
                  <span className={`w-2.5 h-2.5 rounded-full ${item.dot}`} />
                  {item.label}
                </span>
                <input
                  type="checkbox"
                  checked={layers[item.key]}
                  onChange={() => toggleLayer(item.key)}
                  className="accent-cyan-400 w-3.5 h-3.5 rounded cursor-pointer"
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Bottom-Left Compact Severity Legend */}
      <div className="hidden sm:flex absolute bottom-4 left-4 z-[500] items-center gap-3 px-3.5 py-2 rounded-xl bg-[#091422]/90 border border-slate-800/90 backdrop-blur-md shadow-xl text-[11px] text-slate-200">
        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
          Hazard Scale:
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-500/40" />
          <span>Critical (&gt;42cm / Manhole)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          <span>High (25–42cm)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span>Moderate</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Cleared / Shelter</span>
        </span>
      </div>
    </div>
  );
};
