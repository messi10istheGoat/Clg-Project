import {
  AlertBannerState,
  BootstrapPayload,
  HazardCategory,
  HazardReport,
  HazardSeverity,
  HydrologyState,
  ReportStatus,
  RouteResponse
} from '../types';

const VOTER_TOKEN_KEY = 'sylhet_live_voter_token_v1';

export function getVoterToken(): string {
  try {
    let existing = localStorage.getItem(VOTER_TOKEN_KEY);
    if (!existing) {
      existing = `syl-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
      localStorage.setItem(VOTER_TOKEN_KEY, existing);
    }
    return existing;
  } catch {
    return 'syl-session-user';
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    },
    ...init
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function fetchBootstrap(): Promise<BootstrapPayload> {
  return requestJson<BootstrapPayload>('/api/bootstrap');
}

export interface CreateReportInput {
  title: string;
  titleBn?: string;
  category: HazardCategory;
  severity: HazardSeverity;
  waterDepthCm: number;
  ward: string;
  areaName: string;
  lat: number;
  lng: number;
  description: string;
  reporterName: string;
  photoUrl?: string;
  verifiedOfficial?: boolean;
}

export async function submitHazardReport(input: CreateReportInput): Promise<HazardReport> {
  const data = await requestJson<{ report: HazardReport }>('/api/reports', {
    method: 'POST',
    body: JSON.stringify(input)
  });
  return data.report;
}

export async function voteHazardReport(
  reportId: string,
  voteType: 'confirm' | 'clear'
): Promise<HazardReport> {
  const data = await requestJson<{ report: HazardReport }>(`/api/reports/${reportId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ voteType, voterToken: getVoterToken() })
  });
  return data.report;
}

export async function postReportComment(
  reportId: string,
  author: string,
  message: string,
  isOfficial = false
): Promise<HazardReport> {
  const data = await requestJson<{ report: HazardReport }>(`/api/reports/${reportId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ author, message, isOfficial })
  });
  return data.report;
}

export async function adminUpdateReport(
  reportId: string,
  patch: {
    status?: ReportStatus;
    verifiedOfficial?: boolean;
    crewDispatched?: boolean;
    waterDepthCm?: number;
    severity?: HazardSeverity;
  }
): Promise<HazardReport> {
  const data = await requestJson<{ report: HazardReport }>(`/api/reports/${reportId}/admin`, {
    method: 'PATCH',
    body: JSON.stringify(patch)
  });
  return data.report;
}

export async function adminDeleteReport(reportId: string): Promise<void> {
  await requestJson(`/api/reports/${reportId}`, { method: 'DELETE' });
}

export async function calculateSafeRoute(
  originId: string,
  destinationId: string,
  vehicleId: string
): Promise<RouteResponse> {
  return requestJson<RouteResponse>('/api/route', {
    method: 'POST',
    body: JSON.stringify({ originId, destinationId, vehicleId })
  });
}

export async function activateScenario(
  scenarioId: string
): Promise<{ hydrology: HydrologyState; reports: HazardReport[] }> {
  return requestJson<{ hydrology: HydrologyState; reports: HazardReport[] }>(
    '/api/hydrology/scenario',
    {
      method: 'POST',
      body: JSON.stringify({ scenarioId })
    }
  );
}

export async function updateEmergencyBanner(
  patch: Partial<AlertBannerState>
): Promise<HydrologyState> {
  const data = await requestJson<{ hydrology: HydrologyState }>('/api/hydrology/banner', {
    method: 'PATCH',
    body: JSON.stringify(patch)
  });
  return data.hydrology;
}

export async function resetDemoData(): Promise<{
  reports: HazardReport[];
  hydrology: HydrologyState;
}> {
  return requestJson('/api/admin/reset', { method: 'POST' });
}

export interface LiveOpenMeteoWeather {
  tempC: number;
  humidityPct: number;
  windKmh: number;
  precipMm: number;
  fetchedLive: boolean;
}

export async function fetchLiveSylhetAtmosphere(): Promise<LiveOpenMeteoWeather | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=24.8949&longitude=91.8687&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&timezone=Asia%2FDhaka',
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.current) return null;
    return {
      tempC: Number(json.current.temperature_2m),
      humidityPct: Number(json.current.relative_humidity_2m),
      windKmh: Number(json.current.wind_speed_10m),
      precipMm: Number(json.current.precipitation),
      fetchedLive: true
    };
  } catch {
    return null;
  }
}
