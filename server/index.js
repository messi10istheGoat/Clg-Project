import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import {
  listReports,
  getReportById,
  createReport,
  voteOnReport,
  addCommentToReport,
  updateReportAdmin,
  deleteReportById,
  getHydrologyState,
  setHydrologyScenario,
  updateAlertBanner,
  seedDatabase,
  getGeoStaticData,
  SCENARIO_PRESETS
} from './db.js';
import { computeSafeSylhetRoute, VEHICLE_PROFILES } from './routeEngine.js';
import { ROAD_EDGES } from './sylhetSeedData.js';

export async function createServerInstance({ isProd = process.env.NODE_ENV === 'production', attachVite = true } = {}) {
  const app = express();
  const httpServer = http.createServer(app);

  app.use(express.json({ limit: '6mb' }));

  // SSE Connected Clients
  const sseClients = new Set();

  function broadcastEvent(type, payload) {
    const data = `data: ${JSON.stringify({ type, payload, ts: new Date().toISOString() })}\n\n`;
    for (const res of sseClients) {
      try {
        res.write(data);
      } catch {
        sseClients.delete(res);
      }
    }
  }

  // Heartbeat every 20s so proxies keep SSE stream open
  const heartbeat = setInterval(() => {
    for (const res of sseClients) {
      try {
        res.write(': heartbeat\n\n');
      } catch {
        sseClients.delete(res);
      }
    }
  }, 20000);
  heartbeat.unref?.();

  // --- API ROUTES ---

  app.get('/api/health', (_req, res) => {
    const reports = listReports();
    res.json({
      ok: true,
      service: 'Sylhet Live — Waterlogging & Road Hazard API',
      timestamp: new Date().toISOString(),
      totalReports: reports.length,
      activeReports: reports.filter((r) => r.status !== 'resolved').length
    });
  });

  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    res.write(`data: ${JSON.stringify({ type: 'connected', ts: new Date().toISOString() })}\n\n`);
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  app.get('/api/bootstrap', (_req, res) => {
    const geo = getGeoStaticData();
    res.json({
      reports: listReports(),
      hydrology: getHydrologyState(),
      geo: {
        ...geo,
        edges: ROAD_EDGES
      },
      vehicleProfiles: Object.values(VEHICLE_PROFILES),
      scenarios: Object.values(SCENARIO_PRESETS).map((s) => ({
        id: s.scenarioId,
        label: s.scenarioLabel,
        rain24h: s.sylhetRainfall24hMm,
        rainRate: s.currentRainRateMmHr,
        surmaLevelM: s.gauges[0]?.currentLevelM
      }))
    });
  });

  app.get('/api/reports', (_req, res) => {
    res.json({ reports: listReports() });
  });

  app.get('/api/reports/:id', (req, res) => {
    const report = getReportById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json({ report });
  });

  app.post('/api/reports', (req, res) => {
    const { title, category, lat, lng, areaName } = req.body || {};
    if (!title || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'Title and valid Sylhet map coordinates (lat, lng) are required.' });
    }
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (Number.isNaN(latNum) || Number.isNaN(lngNum) || latNum < 24.75 || latNum > 25.05 || lngNum < 91.70 || lngNum > 92.05) {
      return res.status(400).json({
        error: 'Coordinates must lie within Greater Sylhet metropolitan bounds (24.75–25.05°N, 91.70–92.05°E).'
      });
    }

    const created = createReport({
      ...req.body,
      category: category || 'waterlogging',
      areaName: areaName || 'Sylhet City'
    });

    broadcastEvent('report_created', created);
    res.status(201).json({ report: created });
  });

  app.post('/api/reports/:id/vote', (req, res) => {
    const { voteType, voterToken } = req.body || {};
    if (!['confirm', 'clear'].includes(voteType)) {
      return res.status(400).json({ error: 'voteType must be "confirm" or "clear"' });
    }
    const result = voteOnReport(req.params.id, voterToken || 'anon', voteType);
    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }
    broadcastEvent('report_updated', result.report);
    res.json({ report: result.report });
  });

  app.post('/api/reports/:id/comments', (req, res) => {
    const { author, message, isOfficial } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Comment message cannot be empty.' });
    }
    const updated = addCommentToReport(req.params.id, { author, message, isOfficial: Boolean(isOfficial) });
    if (!updated) {
      return res.status(404).json({ error: 'Report not found' });
    }
    broadcastEvent('report_updated', updated);
    res.status(201).json({ report: updated });
  });

  app.patch('/api/reports/:id/admin', (req, res) => {
    const updated = updateReportAdmin(req.params.id, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: 'Report not found' });
    }
    broadcastEvent('report_updated', updated);
    res.json({ report: updated });
  });

  app.delete('/api/reports/:id', (req, res) => {
    const deleted = deleteReportById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Report not found' });
    }
    broadcastEvent('report_deleted', { id: req.params.id });
    res.json({ ok: true, id: req.params.id });
  });

  app.post('/api/route', (req, res) => {
    const { originId, destinationId, vehicleId } = req.body || {};
    if (!originId || !destinationId) {
      return res.status(400).json({ error: 'originId and destinationId are required.' });
    }
    const activeReports = listReports();
    const result = computeSafeSylhetRoute({
      originId,
      destinationId,
      vehicleId: vehicleId || 'cng',
      activeReports,
      rainMultiplier: 1.0 // Already reflected in listReports() scaled waterDepthCm
    });

    if (!result.ok) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  app.post('/api/hydrology/scenario', (req, res) => {
    const { scenarioId } = req.body || {};
    const updatedHydro = setHydrologyScenario(scenarioId);
    if (!updatedHydro) {
      return res.status(400).json({ error: 'Unknown scenarioId' });
    }
    const reports = listReports();
    broadcastEvent('scenario_changed', { hydrology: updatedHydro, reports });
    res.json({ hydrology: updatedHydro, reports });
  });

  app.patch('/api/hydrology/banner', (req, res) => {
    const updatedHydro = updateAlertBanner(req.body || {});
    broadcastEvent('hydrology_updated', updatedHydro);
    res.json({ hydrology: updatedHydro });
  });

  app.post('/api/admin/reset', (_req, res) => {
    seedDatabase(true);
    const payload = {
      reports: listReports(),
      hydrology: getHydrologyState()
    };
    broadcastEvent('system_reset', payload);
    res.json({ ok: true, ...payload });
  });

  app.get('/api/export/json', (_req, res) => {
    const data = {
      exportedAt: new Date().toISOString(),
      municipality: 'Sylhet City Corporation (SCC)',
      hydrology: getHydrologyState(),
      reports: listReports()
    };
    res.setHeader('Content-Disposition', 'attachment; filename="sylhet-live-hazards.json"');
    res.json(data);
  });

  app.get('/api/export/csv', (_req, res) => {
    const reports = listReports();
    const headers = [
      'id',
      'title',
      'category',
      'severity',
      'waterDepthCm',
      'status',
      'ward',
      'areaName',
      'lat',
      'lng',
      'verifiedOfficial',
      'crewDispatched',
      'confirmations',
      'clearVotes',
      'reporterName',
      'createdAt',
      'updatedAt'
    ];
    const escapeCsv = (val) => {
      const s = String(val ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const rows = reports.map((r) => headers.map((h) => escapeCsv(r[h])).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="sylhet-live-hazards.csv"');
    res.send(csv);
  });

  // --- FRONTEND SERVING (VITE DEV MIDDLEWARE OR STATIC PROD) ---
  if (attachVite) {
    if (!isProd) {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          allowedHosts: true,
          hmr: { server: httpServer }
        },
        appType: 'spa'
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.resolve(process.cwd(), 'dist');
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('*', (_req, res) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }
    }
  }

  return { app, httpServer };
}

// Run directly if invoked as main entry point
const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(process.cwd(), 'server/index.js');

if (isMain) {
  const PORT = Number(process.env.PORT || 3000);
  const HOST = '0.0.0.0';
  createServerInstance().then(({ httpServer }) => {
    httpServer.listen(PORT, HOST, () => {
      console.log(`🌊 Sylhet Live — Waterlogging & Road Hazard Map running at http://${HOST}:${PORT}`);
    });
  });
}
