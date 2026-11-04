import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ListFilter, Map as MapIcon, CheckCircle2 } from 'lucide-react';
import {
  ActiveTab,
  AlertBannerState,
  GeoStaticData,
  HazardCategory,
  HazardReport,
  HazardSeverity,
  HydrologyState,
  Language,
  ReportStatus,
  RouteResponse,
  ScenarioSummary,
  VehicleProfile
} from './types';
import {
  activateScenario,
  adminDeleteReport,
  adminUpdateReport,
  calculateSafeRoute,
  CreateReportInput,
  fetchBootstrap,
  fetchLiveSylhetAtmosphere,
  LiveOpenMeteoWeather,
  postReportComment,
  resetDemoData,
  submitHazardReport,
  updateEmergencyBanner,
  voteHazardReport
} from './services/api';
import { TopNavbar } from './components/TopNavbar';
import { AlertBanner } from './components/AlertBanner';
import { SylhetMap } from './components/SylhetMap';
import { IncidentSidebar } from './components/IncidentSidebar';
import { IncidentDetailDrawer } from './components/IncidentDetailDrawer';
import { ReportHazardModal } from './components/ReportHazardModal';
import { RoutePlannerPanel } from './components/RoutePlannerPanel';
import { HydrologyDashboard } from './components/HydrologyDashboard';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { EmergencyControlPanel } from './components/EmergencyControlPanel';

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<ActiveTab>('map');
  const [mobileSubView, setMobileSubView] = useState<'map' | 'panel'>('map');

  // Core Data State
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [hydrology, setHydrology] = useState<HydrologyState | null>(null);
  const [geo, setGeo] = useState<GeoStaticData | null>(null);
  const [vehicleProfiles, setVehicleProfiles] = useState<VehicleProfile[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [liveWeather, setLiveWeather] = useState<LiveOpenMeteoWeather | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sseConnected, setSseConnected] = useState<boolean>(false);

  // Filters & Selection
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<HazardCategory | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<HazardSeverity | 'all'>('all');
  const [showResolved, setShowResolved] = useState<boolean>(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Map Camera & Pin-Pick State
  const [flyToTarget, setFlyToTarget] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
    ts: number;
  } | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [pinPickMode, setPinPickMode] = useState<boolean>(false);
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Route Planner State
  const [routeResult, setRouteResult] = useState<RouteResponse | null>(null);
  const [routePresetOrigin, setRoutePresetOrigin] = useState<string | undefined>(undefined);
  const [routePresetDest, setRoutePresetDest] = useState<string | undefined>(undefined);

  // Admin / Moderator Mode & Toast
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((curr) => (curr === msg ? null : curr));
    }, 3600);
  }, []);

  // Initial Bootstrap Load
  useEffect(() => {
    let mounted = true;
    fetchBootstrap()
      .then((data) => {
        if (!mounted) return;
        setReports(data.reports);
        setHydrology(data.hydrology);
        setGeo(data.geo);
        setVehicleProfiles(data.vehicleProfiles);
        setScenarios(data.scenarios);
      })
      .catch((err) => {
        console.error('Bootstrap error:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    fetchLiveSylhetAtmosphere().then((w) => {
      if (mounted && w) setLiveWeather(w);
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Real-time Server-Sent Events Subscription
  useEffect(() => {
    const es = new EventSource('/api/events');

    es.onopen = () => setSseConnected(true);
    es.onerror = () => setSseConnected(false);

    es.onmessage = (evt) => {
      try {
        const parsed = JSON.parse(evt.data);
        if (parsed.type === 'connected') {
          setSseConnected(true);
        } else if (parsed.type === 'report_created') {
          const incoming: HazardReport = parsed.payload;
          setReports((prev) =>
            prev.some((r) => r.id === incoming.id) ? prev : [incoming, ...prev]
          );
        } else if (parsed.type === 'report_updated') {
          const updated: HazardReport = parsed.payload;
          setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        } else if (parsed.type === 'report_deleted') {
          const delId: string = parsed.payload.id;
          setReports((prev) => prev.filter((r) => r.id !== delId));
          setSelectedReportId((curr) => (curr === delId ? null : curr));
        } else if (parsed.type === 'scenario_changed' || parsed.type === 'system_reset') {
          setHydrology(parsed.payload.hydrology);
          setReports(parsed.payload.reports);
        } else if (parsed.type === 'hydrology_updated') {
          setHydrology(parsed.payload);
        }
      } catch {
        // ignore malformed frames
      }
    };

    return () => {
      es.close();
    };
  }, []);

  // Filtered Reports for Map & Sidebar
  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reports.filter((r) => {
      if (!showResolved && r.status === 'resolved') return false;
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (severityFilter !== 'all') {
        if (severityFilter === 'high') {
          if (r.severity !== 'high' && r.severity !== 'critical') return false;
        } else if (r.severity !== severityFilter) {
          return false;
        }
      }
      if (q) {
        const hay = `${r.title} ${r.titleBn || ''} ${r.areaName} ${r.ward} ${r.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [reports, showResolved, categoryFilter, severityFilter, searchQuery]);

  const selectedReport = useMemo(
    () => reports.find((r) => r.id === selectedReportId) || null,
    [reports, selectedReportId]
  );

  const activeHazardCount = useMemo(
    () => reports.filter((r) => r.status !== 'resolved').length,
    [reports]
  );
  const criticalCount = useMemo(
    () => reports.filter((r) => r.status !== 'resolved' && r.severity === 'critical').length,
    [reports]
  );

  // Handlers
  const handleSelectReport = useCallback((rpt: HazardReport) => {
    setSelectedReportId(rpt.id);
    setActiveTab('map');
    setMobileSubView('map');
    setFlyToTarget({ lat: rpt.lat, lng: rpt.lng, zoom: 16, ts: Date.now() });
  }, []);

  const handleCreateReport = async (input: CreateReportInput) => {
    const created = await submitHazardReport(input);
    setReports((prev) => (prev.some((r) => r.id === created.id) ? prev : [created, ...prev]));
    setPickedCoords(null);
    setSelectedReportId(created.id);
    setActiveTab('map');
    setFlyToTarget({ lat: created.lat, lng: created.lng, zoom: 16, ts: Date.now() });
    showToast(`Published live alert at ${created.areaName}`);
  };

  const handleVote = async (reportId: string, voteType: 'confirm' | 'clear') => {
    const updated = await voteHazardReport(reportId, voteType);
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    showToast(voteType === 'confirm' ? 'Confirmed hazard still active' : 'Voted road cleared');
  };

  const handleAddComment = async (
    reportId: string,
    author: string,
    message: string,
    isOfficial: boolean
  ) => {
    const updated = await postReportComment(reportId, author, message, isOfficial);
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    showToast('Field update posted');
  };

  const handleAdminPatch = async (
    reportId: string,
    patch: { status?: ReportStatus; verifiedOfficial?: boolean; crewDispatched?: boolean }
  ) => {
    const updated = await adminUpdateReport(reportId, patch);
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    showToast(`Updated ${reportId}`);
  };

  const handleAdminDelete = async (reportId: string) => {
    await adminDeleteReport(reportId);
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    if (selectedReportId === reportId) setSelectedReportId(null);
    showToast(`Removed report ${reportId}`);
  };

  const handleComputeRoute = async (originId: string, destId: string, vehicleId: string) => {
    const res = await calculateSafeRoute(originId, destId, vehicleId);
    setRouteResult(res);
    setSelectedReportId(null);
  };

  const handlePlanDetourAround = (report: HazardReport) => {
    // Pick smart origin/destination spanning that side of Sylhet
    if (report.lat > 24.905) {
      setRoutePresetOrigin('zindabazar');
      setRoutePresetDest('sust_gate');
    } else if (report.lng > 91.875) {
      setRoutePresetOrigin('bandarbazar');
      setRoutePresetDest('humayun_rashid');
    } else {
      setRoutePresetOrigin('amberkhana');
      setRoutePresetDest('osmani_medical');
    }
    setSelectedReportId(null);
    setActiveTab('routes');
    setMobileSubView('panel');
  };

  const handleScenarioSwitch = async (scenarioId: string) => {
    const data = await activateScenario(scenarioId);
    setHydrology(data.hydrology);
    setReports(data.reports);
    if (routeResult) {
      // Re-run current route under new hydrological scenario!
      const refreshed = await calculateSafeRoute(
        routeResult.safeRoute.origin.id,
        routeResult.safeRoute.destination.id,
        routeResult.vehicle.id
      );
      setRouteResult(refreshed);
    }
    showToast(`Scenario active: ${data.hydrology.scenarioLabel}`);
  };

  const handleBannerUpdate = async (patch: Partial<AlertBannerState>) => {
    const updated = await updateEmergencyBanner(patch);
    setHydrology(updated);
    showToast('SCC emergency broadcast updated');
  };

  const handleSystemReset = async () => {
    const data = await resetDemoData();
    setReports(data.reports);
    setHydrology(data.hydrology);
    setRouteResult(null);
    setSelectedReportId(null);
    showToast('Demo dataset restored to initial Sylhet monsoon state');
  };

  const handleStartMapPinPick = () => {
    setIsReportModalOpen(false);
    setActiveTab('map');
    setMobileSubView('map');
    setPinPickMode(true);
  };

  const handleMapPickedCoords = (coords: { lat: number; lng: number }) => {
    setPickedCoords(coords);
    setPinPickMode(false);
    setIsReportModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070f18] flex flex-col items-center justify-center gap-3 text-slate-300">
        <div className="w-11 h-11 rounded-2xl border-2 border-cyan-400 border-t-transparent animate-spin" />
        <div className="text-sm font-bold tracking-wide text-cyan-200">
          Loading Sylhet Live GIS &amp; Surma Telemetry...
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#070f18]">
      {/* Top Navigation */}
      <TopNavbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'routes') setMobileSubView('panel');
        }}
        lang={lang}
        onToggleLang={() => setLang((l) => (l === 'en' ? 'bn' : 'en'))}
        activeHazardCount={activeHazardCount}
        criticalCount={criticalCount}
        hydrology={hydrology}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        sseConnected={sseConnected}
      />

      {/* Emergency Broadcast Banner */}
      <AlertBanner
        banner={hydrology?.alertBanner}
        lang={lang}
        onNavigate={(tab) => setActiveTab(tab)}
      />

      {/* Main Workspace */}
      <main className="flex-1 min-h-0 relative flex overflow-hidden">
        {(activeTab === 'map' || activeTab === 'routes') && (
          <>
            {/* Left Docked Panel (Incident Feed OR Safe Route Planner) */}
            <div
              className={`${
                mobileSubView === 'panel' ? 'flex' : 'hidden'
              } md:flex w-full md:w-[360px] xl:w-[395px] h-full shrink-0 z-20`}
            >
              {activeTab === 'map' ? (
                <IncidentSidebar
                  reports={filteredReports}
                  selectedReportId={selectedReportId}
                  onSelectReport={handleSelectReport}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  categoryFilter={categoryFilter}
                  onCategoryChange={setCategoryFilter}
                  severityFilter={severityFilter}
                  onSeverityChange={setSeverityFilter}
                  showResolved={showResolved}
                  onToggleResolved={() => setShowResolved((s) => !s)}
                  lang={lang}
                />
              ) : (
                <RoutePlannerPanel
                  nodes={geo?.nodes || []}
                  vehicleProfiles={vehicleProfiles}
                  routeResult={routeResult}
                  lang={lang}
                  initialOriginId={routePresetOrigin}
                  initialDestId={routePresetDest}
                  onComputeRoute={async (o, d, v) => {
                    await handleComputeRoute(o, d, v);
                  }}
                  onClearRoute={() => setRouteResult(null)}
                />
              )}
            </div>

            {/* Center Interactive Sylhet Map */}
            <div
              className={`${
                mobileSubView === 'map' ? 'flex' : 'hidden'
              } md:flex flex-1 h-full relative min-w-0`}
            >
              <SylhetMap
                reports={filteredReports}
                geo={geo}
                selectedReportId={selectedReportId}
                onSelectReport={handleSelectReport}
                routeResult={routeResult}
                pinPickMode={pinPickMode}
                pickedCoords={pickedCoords}
                onMapPickCoords={handleMapPickedCoords}
                onCancelPinPick={() => {
                  setPinPickMode(false);
                  setIsReportModalOpen(true);
                }}
                flyToTarget={flyToTarget}
                lang={lang}
              />
            </div>

            {/* Right Slide-Over Incident Detail Inspector */}
            {selectedReport && activeTab === 'map' && (
              <div className="absolute inset-y-0 right-0 z-[700] flex max-w-full">
                <IncidentDetailDrawer
                  report={selectedReport}
                  vehicleProfiles={vehicleProfiles}
                  lang={lang}
                  isAdminMode={isAdminMode}
                  onClose={() => setSelectedReportId(null)}
                  onVote={handleVote}
                  onAddComment={handleAddComment}
                  onAdminPatch={handleAdminPatch}
                  onPlanDetourAround={handlePlanDetourAround}
                />
              </div>
            )}

            {/* Mobile Floating Map/List Toggle Pill */}
            <div className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-[650] flex items-center bg-[#091422]/95 border border-cyan-500/40 rounded-full p-1 shadow-2xl backdrop-blur-md">
              <button
                onClick={() => setMobileSubView('map')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition ${
                  mobileSubView === 'map'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Map</span>
              </button>
              <button
                onClick={() => setMobileSubView('panel')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition ${
                  mobileSubView === 'panel'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>
                  {activeTab === 'map' ? `List (${filteredReports.length})` : 'Planner'}
                </span>
              </button>
            </div>
          </>
        )}

        {activeTab === 'hydrology' && (
          <HydrologyDashboard
            hydrology={hydrology}
            scenarios={scenarios}
            channels={geo?.hydroChannels || []}
            liveWeather={liveWeather}
            lang={lang}
            onSelectScenario={handleScenarioSwitch}
            onFlyToMapPoint={(lat, lng) => {
              setActiveTab('map');
              setMobileSubView('map');
              setFlyToTarget({ lat, lng, zoom: 15, ts: Date.now() });
            }}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            reports={reports}
            lang={lang}
            onInspectReport={(rpt) => handleSelectReport(rpt)}
          />
        )}

        {activeTab === 'emergency' && (
          <EmergencyControlPanel
            facilities={geo?.emergencyFacilities || []}
            reports={reports}
            banner={hydrology?.alertBanner}
            lang={lang}
            isAdminMode={isAdminMode}
            onToggleAdminMode={() => setIsAdminMode((m) => !m)}
            onFlyToFacility={(lat, lng) => {
              setActiveTab('map');
              setMobileSubView('map');
              setFlyToTarget({ lat, lng, zoom: 16, ts: Date.now() });
            }}
            onAdminPatchReport={handleAdminPatch}
            onAdminDeleteReport={handleAdminDelete}
            onUpdateBanner={handleBannerUpdate}
            onResetSystem={handleSystemReset}
          />
        )}
      </main>

      {/* Report Hazard Modal */}
      <ReportHazardModal
        isOpen={isReportModalOpen}
        nodes={geo?.nodes || []}
        pickedCoords={pickedCoords}
        lang={lang}
        isAdminMode={isAdminMode}
        onClose={() => setIsReportModalOpen(false)}
        onStartMapPick={handleStartMapPinPick}
        onSubmit={handleCreateReport}
      />

      {/* Live Feedback Toast */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-[1200] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-cyan-400/50 text-cyan-100 text-xs font-semibold shadow-2xl backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};
