export type Language = 'en' | 'bn';

export type HazardCategory =
  | 'waterlogging'
  | 'open_manhole'
  | 'pothole'
  | 'road_construction'
  | 'fallen_tree'
  | 'traffic_gridlock';

export type HazardSeverity = 'low' | 'moderate' | 'high' | 'critical';

export type ReportStatus = 'active' | 'monitoring' | 'resolved';

export type ActiveTab = 'map' | 'routes' | 'hydrology' | 'analytics' | 'emergency';

export interface ReportComment {
  id: string;
  reportId: string;
  author: string;
  message: string;
  isOfficial: boolean;
  createdAt: string;
}

export interface HazardReport {
  id: string;
  title: string;
  titleBn?: string;
  category: HazardCategory;
  severity: HazardSeverity;
  baseSeverity?: HazardSeverity;
  waterDepthCm: number;
  baseWaterDepthCm?: number;
  ward: string;
  areaName: string;
  lat: number;
  lng: number;
  description: string;
  reporterName: string;
  verifiedOfficial: boolean;
  crewDispatched: boolean;
  confirmations: number;
  clearVotes: number;
  status: ReportStatus;
  photoUrl: string;
  createdAt: string;
  updatedAt: string;
  comments: ReportComment[];
}

export interface RiverGauge {
  id: string;
  river: string;
  station: string;
  stationBn: string;
  currentLevelM: number;
  dangerLevelM: number;
  change6hCm: number;
  trend: 'rising' | 'receding' | 'above_danger' | 'steady';
  history24h: number[];
}

export interface AlertBannerState {
  active: boolean;
  level: 'info' | 'warning' | 'critical';
  titleEn: string;
  titleBn: string;
  messageEn: string;
  messageBn: string;
}

export interface HydrologyState {
  scenarioId: string;
  scenarioLabel: string;
  depthMultiplier?: number;
  alertBanner: AlertBannerState;
  sylhetRainfall24hMm: number;
  currentRainRateMmHr: number;
  cherrapunjiUpstream24hMm: number;
  humidityPct: number;
  temperatureC: number;
  gauges: RiverGauge[];
}

export interface RoadNode {
  id: string;
  name: string;
  nameBn: string;
  ward: string;
  lat: number;
  lng: number;
}

export interface RoadEdge {
  from: string;
  to: string;
  road: string;
  roadBn: string;
  km: number;
  speed: number;
  isKeaneBridge?: boolean;
}

export interface HydroChannel {
  id: string;
  name: string;
  nameBn: string;
  type: 'river' | 'chara';
  status: string;
  statusNote: string;
  coords: [number, number][];
}

export interface FloodZone {
  id: string;
  name: string;
  nameBn: string;
  ward: string;
  riskLevel: 'critical' | 'high' | 'moderate';
  avgElevationM: number;
  summary: string;
  polygon: [number, number][];
}

export interface EmergencyFacility {
  id: string;
  name: string;
  nameBn: string;
  type: 'control_room' | 'hospital' | 'fire_rescue' | 'shelter' | 'utility';
  ward: string;
  lat: number;
  lng: number;
  phone: string;
  capacity: string;
}

export interface GeoStaticData {
  nodes: RoadNode[];
  edges: RoadEdge[];
  hydroChannels: HydroChannel[];
  floodZones: FloodZone[];
  emergencyFacilities: EmergencyFacility[];
}

export interface VehicleProfile {
  id: string;
  name: string;
  nameBn: string;
  maxSafeDepthCm: number;
  hardBlockDepthCm: number;
  speedMultiplier: number;
  keaneBridgeAllowed: boolean;
  manholeSensitive: boolean;
}

export interface RouteStep {
  fromName: string;
  fromNameBn: string;
  toName: string;
  toNameBn: string;
  road: string;
  roadBn: string;
  km: number;
  minutes: number;
  maxDepthCm: number;
  status: 'safe' | 'caution' | 'impassable';
  isKeaneBridge?: boolean;
  hazardCount: number;
}

export interface ComputedRoute {
  origin: RoadNode;
  destination: RoadNode;
  coordinates: [number, number][];
  nodes: { id: string; name: string; nameBn: string; lat: number; lng: number }[];
  steps: RouteStep[];
  totalKm: number;
  estimatedMinutes: number;
  maxWaterDepthCm: number;
  status: 'safe' | 'caution' | 'impassable';
  hazardsOnRoute: {
    id: string;
    title: string;
    titleBn?: string;
    category: HazardCategory;
    severity: HazardSeverity;
    waterDepthCm: number;
    distanceM: number;
    areaName: string;
  }[];
}

export interface RouteResponse {
  ok: boolean;
  vehicle: VehicleProfile;
  samePath: boolean;
  avoidedHazards: ComputedRoute['hazardsOnRoute'];
  standardRoute: ComputedRoute;
  safeRoute: ComputedRoute;
}

export interface ScenarioSummary {
  id: string;
  label: string;
  rain24h: number;
  rainRate: number;
  surmaLevelM: number;
}

export interface BootstrapPayload {
  reports: HazardReport[];
  hydrology: HydrologyState;
  geo: GeoStaticData;
  vehicleProfiles: VehicleProfile[];
  scenarios: ScenarioSummary[];
}

export type MapStyleId = 'dark' | 'voyager' | 'osm';

export interface MapLayerVisibility {
  reports: boolean;
  floodZones: boolean;
  hydroNetwork: boolean;
  roadGraph: boolean;
  shelters: boolean;
}
