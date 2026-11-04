import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  buildInitialReports,
  buildInitialComments,
  INITIAL_HYDROLOGY,
  ROAD_NODES,
  HYDRO_CHANNELS,
  FLOOD_ZONES,
  EMERGENCY_FACILITIES
} from './sylhetSeedData.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.SYLHET_DB_PATH || path.join(DATA_DIR, 'sylhet_live.sqlite');
const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    titleBn TEXT DEFAULT '',
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    waterDepthCm INTEGER NOT NULL DEFAULT 0,
    ward TEXT NOT NULL DEFAULT 'Ward 1',
    areaName TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    reporterName TEXT NOT NULL DEFAULT 'Citizen Reporter',
    verifiedOfficial INTEGER NOT NULL DEFAULT 0,
    crewDispatched INTEGER NOT NULL DEFAULT 0,
    confirmations INTEGER NOT NULL DEFAULT 1,
    clearVotes INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    photoUrl TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    reportId TEXT NOT NULL,
    author TEXT NOT NULL,
    message TEXT NOT NULL,
    isOfficial INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (reportId) REFERENCES reports(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS votes (
    reportId TEXT NOT NULL,
    voterToken TEXT NOT NULL,
    voteType TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    PRIMARY KEY (reportId, voterToken)
  );

  CREATE TABLE IF NOT EXISTS system_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

export const SCENARIO_PRESETS = {
  live_monsoon: {
    ...INITIAL_HYDROLOGY,
    depthMultiplier: 1.0
  },
  dry_normal: {
    scenarioId: 'dry_normal',
    scenarioLabel: 'Post-Rain Drainage Recovery (Clear Sky)',
    depthMultiplier: 0.28,
    alertBanner: {
      active: true,
      level: 'info',
      titleEn: 'POST-SHOWER RECOVERY — MAJOR CORRIDORS DRAINING NORMALLY',
      titleBn: 'বৃষ্টি-পরবর্তী স্বাভাবিক অবস্থা — প্রধান সড়কসমূহ যান চলাচলের উপযোগী',
      messageEn: 'Surma River is well below danger mark (9.48m). Remaining alerts are primarily road surface potholes and ongoing SCC drain construction.',
      messageBn: 'সুরমা নদীর পানি বিপদসীমার অনেক নিচে (৯.৪৮ মিটার)। কিছু স্থানে গর্ত ও ড্রেন সংস্কার কাজ চলমান রয়েছে।'
    },
    sylhetRainfall24hMm: 8,
    currentRainRateMmHr: 0,
    cherrapunjiUpstream24hMm: 22,
    humidityPct: 71,
    temperatureC: 31.2,
    gauges: [
      {
        id: 'surma_sylhet',
        river: 'Surma River',
        station: 'Sylhet Sadar (Chandni Ghat)',
        stationBn: 'সুরমা নদী (চাঁদনীঘাট, সিলেট)',
        currentLevelM: 9.48,
        dangerLevelM: 10.80,
        change6hCm: -18,
        trend: 'receding',
        history24h: [9.95, 9.88, 9.81, 9.74, 9.66, 9.59, 9.53, 9.48]
      },
      {
        id: 'surma_kanairghat',
        river: 'Surma River (Upstream)',
        station: 'Kanairghat Point',
        stationBn: 'সুরমা নদী (কানাইঘাট পয়েন্ট)',
        currentLevelM: 11.62,
        dangerLevelM: 12.75,
        change6hCm: -24,
        trend: 'receding',
        history24h: [12.22, 12.12, 12.02, 11.94, 11.85, 11.77, 11.69, 11.62]
      },
      {
        id: 'kushiyara_amalshid',
        river: 'Kushiyara River',
        station: 'Amalshid Border Point',
        stationBn: 'কুশিয়ারা নদী (অমলশীদ পয়েন্ট)',
        currentLevelM: 14.10,
        dangerLevelM: 15.40,
        change6hCm: -12,
        trend: 'receding',
        history24h: [14.48, 14.41, 14.35, 14.30, 14.24, 14.19, 14.14, 14.10]
      },
      {
        id: 'sari_gowain',
        river: 'Sari-Gowain River',
        station: 'Sarighat (Jaintiapur)',
        stationBn: 'সারি-গোয়াইন নদী (সারিঘাট)',
        currentLevelM: 10.82,
        dangerLevelM: 12.35,
        change6hCm: -15,
        trend: 'receding',
        history24h: [11.30, 11.22, 11.15, 11.08, 11.01, 10.94, 10.88, 10.82]
      }
    ]
  },
  cloudburst_65mm: {
    scenarioId: 'cloudburst_65mm',
    scenarioLabel: 'Severe Urban Cloudburst (65 mm/hr Flash Rain)',
    depthMultiplier: 1.42,
    alertBanner: {
      active: true,
      level: 'critical',
      titleEn: 'SEVERE URBAN CLOUDBURST — 65 MM/HR INTENSE RAINFALL OVER SYLHET',
      titleBn: 'তীব্র শহুরে অতিবৃষ্টি (৬৫ মিমি/ঘণ্টা) — তাৎক্ষণিক জলাবদ্ধতা সতর্কতা',
      messageEn: 'Flash street waterlogging across Zindabazar, Sobhanighat, Taltola, Pathantula & Upashahar. CNGs and low sedans strongly advised to halt or use elevated corridors.',
      messageBn: 'জিন্দাবাজার, সোবহানীঘাট, তালতলা, পাঠানটুলা ও উপশহরে দ্রুত পানি বাড়ছে। সিএনজি ও ছোট গাড়ি নিচু সড়কে প্রবেশ করবেন না।'
    },
    sylhetRainfall24hMm: 162,
    currentRainRateMmHr: 65,
    cherrapunjiUpstream24hMm: 275,
    humidityPct: 96,
    temperatureC: 25.1,
    gauges: [
      {
        id: 'surma_sylhet',
        river: 'Surma River',
        station: 'Sylhet Sadar (Chandni Ghat)',
        stationBn: 'সুরমা নদী (চাঁদনীঘাট, সিলেট)',
        currentLevelM: 10.78,
        dangerLevelM: 10.80,
        change6hCm: +28,
        trend: 'rising',
        history24h: [10.18, 10.26, 10.35, 10.44, 10.52, 10.61, 10.70, 10.78]
      },
      {
        id: 'surma_kanairghat',
        river: 'Surma River (Upstream)',
        station: 'Kanairghat Point',
        stationBn: 'সুরমা নদী (কানাইঘাট পয়েন্ট)',
        currentLevelM: 13.34,
        dangerLevelM: 12.75,
        change6hCm: +36,
        trend: 'above_danger',
        history24h: [12.50, 12.64, 12.78, 12.91, 13.04, 13.15, 13.25, 13.34]
      },
      {
        id: 'kushiyara_amalshid',
        river: 'Kushiyara River',
        station: 'Amalshid Border Point',
        stationBn: 'কুশিয়ারা নদী (অমলশীদ পয়েন্ট)',
        currentLevelM: 15.52,
        dangerLevelM: 15.40,
        change6hCm: +21,
        trend: 'above_danger',
        history24h: [14.95, 15.04, 15.13, 15.22, 15.30, 15.38, 15.45, 15.52]
      },
      {
        id: 'sari_gowain',
        river: 'Sari-Gowain River',
        station: 'Sarighat (Jaintiapur)',
        stationBn: 'সারি-গোয়াইন নদী (সারিঘাট)',
        currentLevelM: 12.48,
        dangerLevelM: 12.35,
        change6hCm: +31,
        trend: 'above_danger',
        history24h: [11.82, 11.94, 12.05, 12.16, 12.26, 12.34, 12.42, 12.48]
      }
    ]
  },
  flash_flood_2022: {
    scenarioId: 'flash_flood_2022',
    scenarioLabel: '2022-Scale Extreme Flash Flood Emergency (Surma +58cm Above DL)',
    depthMultiplier: 1.85,
    alertBanner: {
      active: true,
      level: 'critical',
      titleEn: 'RED EMERGENCY — SURMA RIVER 58 CM ABOVE DANGER LEVEL AT SYLHET (11.38m)',
      titleBn: 'জরুরি রেড অ্যালার্ট — সুরমা নদীর পানি বিপদসীমার ৫৮ সেমি উপরে (১১.৩৮ মিটার)',
      messageEn: 'Extreme Cherrapunji deluge (590 mm / 24h) causing river overtopping at Upashahar, Sheikhghat, Sobhanighat & South Surma. Emergency flood shelters open; contact SCC Control Room for rescue boats.',
      messageBn: 'চেরাপুঞ্জিতে রেকর্ড বৃষ্টিপাতে উপশহর, শেখঘাট, সোবহানীঘাট ও দক্ষিণ সুরমা প্লাবিত। নিকটস্থ আশ্রয়কেন্দ্রে অবস্থান নিন এবং জরুরি প্রয়োজনে সিসিক কন্ট্রোল রুমে যোগাযোগ করুন।'
    },
    sylhetRainfall24hMm: 248,
    currentRainRateMmHr: 44,
    cherrapunjiUpstream24hMm: 590,
    humidityPct: 98,
    temperatureC: 24.6,
    gauges: [
      {
        id: 'surma_sylhet',
        river: 'Surma River',
        station: 'Sylhet Sadar (Chandni Ghat)',
        stationBn: 'সুরমা নদী (চাঁদনীঘাট, সিলেট)',
        currentLevelM: 11.38,
        dangerLevelM: 10.80,
        change6hCm: +46,
        trend: 'above_danger',
        history24h: [10.45, 10.62, 10.79, 10.94, 11.08, 11.20, 11.30, 11.38]
      },
      {
        id: 'surma_kanairghat',
        river: 'Surma River (Upstream)',
        station: 'Kanairghat Point',
        stationBn: 'সুরমা নদী (কানাইঘাট পয়েন্ট)',
        currentLevelM: 14.12,
        dangerLevelM: 12.75,
        change6hCm: +54,
        trend: 'above_danger',
        history24h: [13.02, 13.22, 13.41, 13.59, 13.76, 13.90, 14.02, 14.12]
      },
      {
        id: 'kushiyara_amalshid',
        river: 'Kushiyara River',
        station: 'Amalshid Border Point',
        stationBn: 'কুশিয়ারা নদী (অমলশীদ পয়েন্ট)',
        currentLevelM: 16.45,
        dangerLevelM: 15.40,
        change6hCm: +48,
        trend: 'above_danger',
        history24h: [15.40, 15.58, 15.76, 15.92, 16.08, 16.22, 16.35, 16.45]
      },
      {
        id: 'sari_gowain',
        river: 'Sari-Gowain River',
        station: 'Sarighat (Jaintiapur)',
        stationBn: 'সারি-গোয়াইন নদী (সারিঘাট)',
        currentLevelM: 13.28,
        dangerLevelM: 12.35,
        change6hCm: +39,
        trend: 'above_danger',
        history24h: [12.40, 12.56, 12.72, 12.88, 13.01, 13.12, 13.21, 13.28]
      }
    ]
  }
};

export function seedDatabase(forceReset = false) {
  if (forceReset) {
    db.exec(`DELETE FROM votes; DELETE FROM comments; DELETE FROM reports; DELETE FROM system_state;`);
  }

  const countRow = db.prepare(`SELECT COUNT(*) as cnt FROM reports`).get();
  if (!countRow || countRow.cnt === 0) {
    const insertReport = db.prepare(`
      INSERT INTO reports (
        id, title, titleBn, category, severity, waterDepthCm, ward, areaName,
        lat, lng, description, reporterName, verifiedOfficial, crewDispatched,
        confirmations, clearVotes, status, photoUrl, createdAt, updatedAt
      ) VALUES (
        @id, @title, @titleBn, @category, @severity, @waterDepthCm, @ward, @areaName,
        @lat, @lng, @description, @reporterName, @verifiedOfficial, @crewDispatched,
        @confirmations, @clearVotes, @status, @photoUrl, @createdAt, @updatedAt
      )
    `);

    const insertComment = db.prepare(`
      INSERT INTO comments (id, reportId, author, message, isOfficial, createdAt)
      VALUES (@id, @reportId, @author, @message, @isOfficial, @createdAt)
    `);

    for (const r of buildInitialReports()) {
      insertReport.run(r);
    }
    for (const c of buildInitialComments()) {
      insertComment.run(c);
    }
  }

  const stateRow = db.prepare(`SELECT value FROM system_state WHERE key = 'hydrology'`).get();
  if (!stateRow) {
    db.prepare(`INSERT INTO system_state (key, value) VALUES ('hydrology', ?)`).run(
      JSON.stringify(SCENARIO_PRESETS.live_monsoon)
    );
  }
}

seedDatabase(false);

export function getHydrologyState() {
  const row = db.prepare(`SELECT value FROM system_state WHERE key = 'hydrology'`).get();
  if (!row) return SCENARIO_PRESETS.live_monsoon;
  try {
    return JSON.parse(row.value);
  } catch {
    return SCENARIO_PRESETS.live_monsoon;
  }
}

export function setHydrologyScenario(scenarioId) {
  const preset = SCENARIO_PRESETS[scenarioId];
  if (!preset) return null;
  db.prepare(`INSERT OR REPLACE INTO system_state (key, value) VALUES ('hydrology', ?)`).run(
    JSON.stringify(preset)
  );
  return preset;
}

export function updateAlertBanner(bannerPatch) {
  const current = getHydrologyState();
  const updated = {
    ...current,
    alertBanner: {
      ...current.alertBanner,
      ...bannerPatch
    }
  };
  db.prepare(`INSERT OR REPLACE INTO system_state (key, value) VALUES ('hydrology', ?)`).run(
    JSON.stringify(updated)
  );
  return updated;
}

function formatReportRow(row, commentsMap, depthMultiplier = 1.0) {
  const rawDepth = Number(row.waterDepthCm || 0);
  const scaledDepth =
    row.status === 'resolved' || rawDepth === 0
      ? rawDepth
      : Math.round(rawDepth * depthMultiplier);

  // Escalate/de-escalate effective severity dynamically when scenario multiplier changes water depth
  let effectiveSeverity = row.severity;
  if (row.category === 'waterlogging' && row.status !== 'resolved') {
    if (scaledDepth >= 42) effectiveSeverity = 'critical';
    else if (scaledDepth >= 25) effectiveSeverity = 'high';
    else if (scaledDepth >= 12) effectiveSeverity = 'moderate';
    else effectiveSeverity = 'low';
  }

  return {
    id: row.id,
    title: row.title,
    titleBn: row.titleBn || '',
    category: row.category,
    severity: effectiveSeverity,
    baseSeverity: row.severity,
    waterDepthCm: scaledDepth,
    baseWaterDepthCm: rawDepth,
    ward: row.ward,
    areaName: row.areaName,
    lat: Number(row.lat),
    lng: Number(row.lng),
    description: row.description,
    reporterName: row.reporterName,
    verifiedOfficial: Boolean(row.verifiedOfficial),
    crewDispatched: Boolean(row.crewDispatched),
    confirmations: Number(row.confirmations),
    clearVotes: Number(row.clearVotes),
    status: row.status,
    photoUrl: row.photoUrl || '',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    comments: commentsMap.get(row.id) || []
  };
}

export function listReports() {
  const hydro = getHydrologyState();
  const mult = Number(hydro.depthMultiplier || 1.0);

  const reportRows = db.prepare(`SELECT * FROM reports ORDER BY updatedAt DESC`).all();
  const commentRows = db.prepare(`SELECT * FROM comments ORDER BY createdAt ASC`).all();

  const commentsMap = new Map();
  for (const c of commentRows) {
    const list = commentsMap.get(c.reportId) || [];
    list.push({
      id: c.id,
      reportId: c.reportId,
      author: c.author,
      message: c.message,
      isOfficial: Boolean(c.isOfficial),
      createdAt: c.createdAt
    });
    commentsMap.set(c.reportId, list);
  }

  return reportRows.map((r) => formatReportRow(r, commentsMap, mult));
}

export function getReportById(id) {
  const all = listReports();
  return all.find((r) => r.id === id) || null;
}

export function createReport(payload) {
  const now = new Date().toISOString();
  const id = `RPT-SYL-${Math.floor(1000 + Math.random() * 9000)}`;
  const depth = Math.max(0, Math.min(200, Number(payload.waterDepthCm || 0)));

  let severity = payload.severity || 'moderate';
  if (!['low', 'moderate', 'high', 'critical'].includes(severity)) {
    severity = depth >= 42 ? 'critical' : depth >= 25 ? 'high' : depth >= 12 ? 'moderate' : 'low';
  }

  const record = {
    id,
    title: String(payload.title || '').trim() || 'Waterlogging / Hazard Report',
    titleBn: String(payload.titleBn || '').trim(),
    category: String(payload.category || 'waterlogging'),
    severity,
    waterDepthCm: depth,
    ward: String(payload.ward || 'Ward 2'),
    areaName: String(payload.areaName || 'Sylhet City'),
    lat: Number(payload.lat),
    lng: Number(payload.lng),
    description: String(payload.description || '').trim(),
    reporterName: String(payload.reporterName || '').trim() || 'Anonymous Citizen',
    verifiedOfficial: payload.verifiedOfficial ? 1 : 0,
    crewDispatched: 0,
    confirmations: 1,
    clearVotes: 0,
    status: 'active',
    photoUrl: String(payload.photoUrl || ''),
    createdAt: now,
    updatedAt: now
  };

  db.prepare(`
    INSERT INTO reports (
      id, title, titleBn, category, severity, waterDepthCm, ward, areaName,
      lat, lng, description, reporterName, verifiedOfficial, crewDispatched,
      confirmations, clearVotes, status, photoUrl, createdAt, updatedAt
    ) VALUES (
      @id, @title, @titleBn, @category, @severity, @waterDepthCm, @ward, @areaName,
      @lat, @lng, @description, @reporterName, @verifiedOfficial, @crewDispatched,
      @confirmations, @clearVotes, @status, @photoUrl, @createdAt, @updatedAt
    )
  `).run(record);

  return getReportById(id);
}

export function voteOnReport(reportId, voterToken, voteType) {
  const row = db.prepare(`SELECT * FROM reports WHERE id = ?`).get(reportId);
  if (!row) return { error: 'Report not found', status: 404 };

  const token = String(voterToken || 'anon').slice(0, 80);
  const existing = db
    .prepare(`SELECT voteType FROM votes WHERE reportId = ? AND voterToken = ?`)
    .get(reportId, token);

  const now = new Date().toISOString();
  let confirmations = Number(row.confirmations);
  let clearVotes = Number(row.clearVotes);

  if (existing) {
    if (existing.voteType === voteType) {
      // Toggle off vote if clicked again
      db.prepare(`DELETE FROM votes WHERE reportId = ? AND voterToken = ?`).run(reportId, token);
      if (voteType === 'confirm') confirmations = Math.max(0, confirmations - 1);
      if (voteType === 'clear') clearVotes = Math.max(0, clearVotes - 1);
    } else {
      // Switch vote
      db.prepare(`UPDATE votes SET voteType = ?, createdAt = ? WHERE reportId = ? AND voterToken = ?`).run(
        voteType,
        now,
        reportId,
        token
      );
      if (voteType === 'confirm') {
        confirmations += 1;
        clearVotes = Math.max(0, clearVotes - 1);
      } else {
        clearVotes += 1;
        confirmations = Math.max(0, confirmations - 1);
      }
    }
  } else {
    db.prepare(`INSERT INTO votes (reportId, voterToken, voteType, createdAt) VALUES (?, ?, ?, ?)`).run(
      reportId,
      token,
      voteType,
      now
    );
    if (voteType === 'confirm') confirmations += 1;
    else clearVotes += 1;
  }

  // Auto-transition status if strong community consensus reports cleared
  let nextStatus = row.status;
  if (clearVotes >= 5 && clearVotes > confirmations && row.status === 'active') {
    nextStatus = 'monitoring';
  }
  if (clearVotes >= 8 && clearVotes >= confirmations + 3) {
    nextStatus = 'resolved';
  }
  if (confirmations > clearVotes && row.status === 'resolved' && voteType === 'confirm') {
    nextStatus = 'active';
  }

  db.prepare(`
    UPDATE reports
    SET confirmations = ?, clearVotes = ?, status = ?, updatedAt = ?
    WHERE id = ?
  `).run(confirmations, clearVotes, nextStatus, now, reportId);

  return { report: getReportById(reportId) };
}

export function addCommentToReport(reportId, { author, message, isOfficial = false }) {
  const row = db.prepare(`SELECT id FROM reports WHERE id = ?`).get(reportId);
  if (!row) return null;

  const now = new Date().toISOString();
  const id = `CMT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  db.prepare(`
    INSERT INTO comments (id, reportId, author, message, isOfficial, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id,
    reportId,
    String(author || 'Citizen Commuter').trim().slice(0, 60),
    String(message || '').trim().slice(0, 600),
    isOfficial ? 1 : 0,
    now
  );

  db.prepare(`UPDATE reports SET updatedAt = ? WHERE id = ?`).run(now, reportId);
  return getReportById(reportId);
}

export function updateReportAdmin(reportId, patch) {
  const row = db.prepare(`SELECT * FROM reports WHERE id = ?`).get(reportId);
  if (!row) return null;

  const now = new Date().toISOString();
  const nextStatus = patch.status ?? row.status;
  const nextVerified =
    patch.verifiedOfficial !== undefined ? (patch.verifiedOfficial ? 1 : 0) : row.verifiedOfficial;
  const nextCrew =
    patch.crewDispatched !== undefined ? (patch.crewDispatched ? 1 : 0) : row.crewDispatched;
  const nextDepth =
    patch.waterDepthCm !== undefined ? Math.max(0, Number(patch.waterDepthCm)) : row.waterDepthCm;
  const nextSeverity = patch.severity ?? row.severity;

  db.prepare(`
    UPDATE reports
    SET status = ?, verifiedOfficial = ?, crewDispatched = ?, waterDepthCm = ?, severity = ?, updatedAt = ?
    WHERE id = ?
  `).run(nextStatus, nextVerified, nextCrew, nextDepth, nextSeverity, now, reportId);

  return getReportById(reportId);
}

export function deleteReportById(reportId) {
  const info = db.prepare(`DELETE FROM reports WHERE id = ?`).run(reportId);
  return info.changes > 0;
}

export function getGeoStaticData() {
  return {
    nodes: ROAD_NODES,
    hydroChannels: HYDRO_CHANNELS,
    floodZones: FLOOD_ZONES,
    emergencyFacilities: EMERGENCY_FACILITIES
  };
}
