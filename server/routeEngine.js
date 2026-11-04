import { ROAD_NODES, ROAD_EDGES } from './sylhetSeedData.js';

export const VEHICLE_PROFILES = {
  pedestrian: {
    id: 'pedestrian',
    name: 'Pedestrian',
    nameBn: 'পথচারী',
    maxSafeDepthCm: 18,
    hardBlockDepthCm: 35,
    speedMultiplier: 0.22,
    keaneBridgeAllowed: true,
    manholeSensitive: true
  },
  rickshaw: {
    id: 'rickshaw',
    name: 'Rickshaw',
    nameBn: 'রিকশা / অটোরিকশা',
    maxSafeDepthCm: 24,
    hardBlockDepthCm: 38,
    speedMultiplier: 0.55,
    keaneBridgeAllowed: true,
    manholeSensitive: true
  },
  cng: {
    id: 'cng',
    name: 'CNG Auto-Rickshaw',
    nameBn: 'সিএনজি অটোরিকশা',
    maxSafeDepthCm: 18,
    hardBlockDepthCm: 27,
    speedMultiplier: 0.90,
    keaneBridgeAllowed: false,
    manholeSensitive: true
  },
  motorbike: {
    id: 'motorbike',
    name: 'Motorbike',
    nameBn: 'মোটরবাইক',
    maxSafeDepthCm: 24,
    hardBlockDepthCm: 36,
    speedMultiplier: 1.05,
    keaneBridgeAllowed: true,
    manholeSensitive: true
  },
  car: {
    id: 'car',
    name: 'Private Car / Sedan',
    nameBn: 'প্রাইভেট কার',
    maxSafeDepthCm: 21,
    hardBlockDepthCm: 32,
    speedMultiplier: 1.0,
    keaneBridgeAllowed: false,
    manholeSensitive: false
  },
  suv_ambulance: {
    id: 'suv_ambulance',
    name: 'Ambulance / SUV',
    nameBn: 'অ্যাম্বুলেন্স / এসইউভি',
    maxSafeDepthCm: 42,
    hardBlockDepthCm: 58,
    speedMultiplier: 1.12,
    keaneBridgeAllowed: false,
    manholeSensitive: false
  }
};

function toMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const avgLat = ((lat1 + lat2) * 0.5 * Math.PI) / 180;
  const x = dLng * Math.cos(avgLat) * R;
  const y = dLat * R;
  return Math.sqrt(x * x + y * y);
}

// Minimum distance (meters) from point P to segment AB
function pointToSegmentDistanceM(pLat, pLng, aLat, aLng, bLat, bLng) {
  const avgLatRad = ((aLat + bLat) * 0.5 * Math.PI) / 180;
  const scaleX = 111320 * Math.cos(avgLatRad);
  const scaleY = 110540;

  const px = (pLng - aLng) * scaleX;
  const py = (pLat - aLat) * scaleY;
  const bx = (bLng - aLng) * scaleX;
  const by = (bLat - aLat) * scaleY;

  const segLenSq = bx * bx + by * by;
  if (segLenSq === 0) return toMeters(pLat, pLng, aLat, aLng);

  let t = (px * bx + py * by) / segLenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = t * bx;
  const projY = t * by;
  const dx = px - projX;
  const dy = py - projY;
  return Math.sqrt(dx * dx + dy * dy);
}

function evaluateEdgeHazards(edge, nodeMap, activeReports, rainMultiplier = 1) {
  const a = nodeMap.get(edge.from);
  const b = nodeMap.get(edge.to);
  if (!a || !b) return { maxDepthCm: 0, hazards: [] };

  let maxDepthCm = 0;
  const nearbyHazards = [];

  for (const rpt of activeReports) {
    if (rpt.status === 'resolved') continue;
    const distM = pointToSegmentDistanceM(rpt.lat, rpt.lng, a.lat, a.lng, b.lat, b.lng);
    // Road corridors affected within 230m radius of pin
    if (distM <= 230) {
      const proximityWeight = distM <= 110 ? 1.0 : 1.0 - ((distM - 110) / 120) * 0.35;
      const statusFactor = rpt.status === 'monitoring' ? 0.75 : 1.0;
      const effectiveDepth = Math.round((rpt.waterDepthCm || 0) * proximityWeight * statusFactor * rainMultiplier);
      if (effectiveDepth > maxDepthCm) {
        maxDepthCm = effectiveDepth;
      }
      nearbyHazards.push({
        id: rpt.id,
        title: rpt.title,
        titleBn: rpt.titleBn,
        category: rpt.category,
        severity: rpt.severity,
        waterDepthCm: effectiveDepth,
        rawDepthCm: rpt.waterDepthCm,
        distanceM: Math.round(distM),
        areaName: rpt.areaName
      });
    }
  }

  return { maxDepthCm, hazards: nearbyHazards };
}

function runDijkstra({ originId, destinationId, vehicle, activeReports, avoidHazards, rainMultiplier = 1 }) {
  const nodeMap = new Map(ROAD_NODES.map((n) => [n.id, n]));
  if (!nodeMap.has(originId) || !nodeMap.has(destinationId)) {
    return null;
  }

  const adj = new Map();
  for (const n of ROAD_NODES) adj.set(n.id, []);

  for (const edge of ROAD_EDGES) {
    if (edge.isKeaneBridge && !vehicle.keaneBridgeAllowed) {
      continue; // Motor cars / CNGs cannot cross historic Keane Bridge
    }

    const { maxDepthCm, hazards } = evaluateEdgeHazards(edge, nodeMap, activeReports, rainMultiplier);
    const effectiveSpeed = Math.max(4, edge.speed * vehicle.speedMultiplier);
    const baseMinutes = (edge.km / effectiveSpeed) * 60;

    let costMinutes = baseMinutes;
    let edgeStatus = 'safe';

    const hasOpenManhole = hazards.some((h) => h.category === 'open_manhole');
    const hasFallenTree = hazards.some((h) => h.category === 'fallen_tree' && h.severity !== 'low');
    const hasCriticalPothole = hazards.some((h) => h.category === 'pothole' && h.severity !== 'low');
    const hasRoadwork = hazards.some((h) => h.category === 'road_construction');

    if (maxDepthCm >= vehicle.hardBlockDepthCm || (hasOpenManhole && vehicle.manholeSensitive && maxDepthCm >= 15)) {
      edgeStatus = 'impassable';
      if (avoidHazards) {
        costMinutes += 10000 + maxDepthCm * 50; // Effectively avoid unless zero physical alternative exists
      }
    } else if (
      maxDepthCm > vehicle.maxSafeDepthCm ||
      hasFallenTree ||
      hasOpenManhole ||
      hasCriticalPothole
    ) {
      edgeStatus = 'caution';
      if (avoidHazards) {
        const excessDepth = Math.max(0, maxDepthCm - vehicle.maxSafeDepthCm);
        costMinutes += 35 + excessDepth * 8 + (hasOpenManhole ? 80 : 0) + (hasFallenTree ? 45 : 0) + (hasCriticalPothole ? 25 : 0);
      }
    } else if (maxDepthCm >= 10 || hasRoadwork) {
      edgeStatus = maxDepthCm >= 14 ? 'caution' : 'safe';
      if (avoidHazards) {
        costMinutes += maxDepthCm * 0.6 + (hasRoadwork ? 8 : 0);
      }
    }

    // Travel slowdown when water/hazards exist on road
    const realMinutes =
      baseMinutes *
      (edgeStatus === 'impassable' ? 3.2 : edgeStatus === 'caution' ? 1.8 : hasRoadwork ? 1.35 : 1.0);

    const edgeRecordFwd = {
      from: edge.from,
      to: edge.to,
      road: edge.road,
      roadBn: edge.roadBn,
      km: edge.km,
      isKeaneBridge: !!edge.isKeaneBridge,
      costMinutes,
      realMinutes,
      maxDepthCm,
      edgeStatus,
      hazards
    };
    const edgeRecordRev = {
      ...edgeRecordFwd,
      from: edge.to,
      to: edge.from
    };

    adj.get(edge.from).push(edgeRecordFwd);
    adj.get(edge.to).push(edgeRecordRev);
  }

  const dist = new Map();
  const prev = new Map();
  const visited = new Set();

  for (const n of ROAD_NODES) dist.set(n.id, Infinity);
  dist.set(originId, 0);

  while (visited.size < ROAD_NODES.length) {
    let u = null;
    let best = Infinity;
    for (const [id, d] of dist.entries()) {
      if (!visited.has(id) && d < best) {
        best = d;
        u = id;
      }
    }
    if (!u || u === destinationId || best === Infinity) break;
    visited.add(u);

    for (const edge of adj.get(u) || []) {
      if (visited.has(edge.to)) continue;
      const alt = best + edge.costMinutes;
      if (alt < dist.get(edge.to)) {
        dist.set(edge.to, alt);
        prev.set(edge.to, edge);
      }
    }
  }

  if (originId !== destinationId && !prev.has(destinationId)) {
    return null;
  }

  const steps = [];
  let curr = destinationId;
  while (curr !== originId) {
    const edge = prev.get(curr);
    if (!edge) break;
    steps.unshift(edge);
    curr = edge.from;
  }

  const originNode = nodeMap.get(originId);
  const coordinates = [[originNode.lat, originNode.lng]];
  const nodeSequence = [originNode];
  let totalKm = 0;
  let totalMinutes = 0;
  let routeMaxDepthCm = 0;
  let overallStatus = 'safe';
  const encounteredHazardsMap = new Map();

  for (const s of steps) {
    const targetNode = nodeMap.get(s.to);
    coordinates.push([targetNode.lat, targetNode.lng]);
    nodeSequence.push(targetNode);
    totalKm += s.km;
    totalMinutes += s.realMinutes;
    if (s.maxDepthCm > routeMaxDepthCm) routeMaxDepthCm = s.maxDepthCm;
    if (s.edgeStatus === 'impassable') overallStatus = 'impassable';
    else if (s.edgeStatus === 'caution' && overallStatus !== 'impassable') overallStatus = 'caution';

    for (const h of s.hazards) {
      encounteredHazardsMap.set(h.id, h);
    }
  }

  return {
    origin: originNode,
    destination: nodeMap.get(destinationId),
    coordinates,
    nodes: nodeSequence.map((n) => ({ id: n.id, name: n.name, nameBn: n.nameBn, lat: n.lat, lng: n.lng })),
    steps: steps.map((s) => ({
      fromName: nodeMap.get(s.from).name,
      fromNameBn: nodeMap.get(s.from).nameBn,
      toName: nodeMap.get(s.to).name,
      toNameBn: nodeMap.get(s.to).nameBn,
      road: s.road,
      roadBn: s.roadBn,
      km: Number(s.km.toFixed(2)),
      minutes: Math.max(1, Math.round(s.realMinutes)),
      maxDepthCm: s.maxDepthCm,
      status: s.edgeStatus,
      isKeaneBridge: s.isKeaneBridge,
      hazardCount: s.hazards.length
    })),
    totalKm: Number(totalKm.toFixed(2)),
    estimatedMinutes: Math.max(1, Math.round(totalMinutes)),
    maxWaterDepthCm: routeMaxDepthCm,
    status: overallStatus,
    hazardsOnRoute: Array.from(encounteredHazardsMap.values())
  };
}

export function computeSafeSylhetRoute({
  originId,
  destinationId,
  vehicleId = 'cng',
  activeReports = [],
  rainMultiplier = 1
}) {
  const vehicle = VEHICLE_PROFILES[vehicleId] || VEHICLE_PROFILES.cng;

  const standardRoute = runDijkstra({
    originId,
    destinationId,
    vehicle,
    activeReports,
    avoidHazards: false,
    rainMultiplier
  });

  const safeRoute = runDijkstra({
    originId,
    destinationId,
    vehicle,
    activeReports,
    avoidHazards: true,
    rainMultiplier
  });

  if (!safeRoute || !standardRoute) {
    return {
      ok: false,
      error: 'Unable to compute route between selected locations.'
    };
  }

  const safeHazardIds = new Set(safeRoute.hazardsOnRoute.map((h) => h.id));
  const avoidedHazards = standardRoute.hazardsOnRoute.filter((h) => !safeHazardIds.has(h.id));
  const samePath =
    standardRoute.nodes.length === safeRoute.nodes.length &&
    standardRoute.nodes.every((n, i) => n.id === safeRoute.nodes[i].id);

  return {
    ok: true,
    vehicle,
    samePath,
    avoidedHazards,
    standardRoute,
    safeRoute
  };
}
