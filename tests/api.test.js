import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';

// Use isolated test SQLite DB so runtime DB stays clean
const testDbPath = path.resolve(process.cwd(), 'data', 'runtime-test.sqlite');
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
process.env.SYLHET_DB_PATH = testDbPath;

const { createServerInstance } = await import('../server/index.js');

async function runTests() {
  const { httpServer } = await createServerInstance({ isProd: true, attachVite: false });

  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const addr = httpServer.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  try {
    console.log('1. Testing /api/health & /api/bootstrap...');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.ok, true);
    assert.ok(health.totalReports >= 12);

    const bootRes = await fetch(`${baseUrl}/api/bootstrap`);
    assert.equal(bootRes.status, 200);
    const boot = await bootRes.json();
    assert.equal(boot.geo.nodes.length, 36);
    assert.equal(boot.hydrology.gauges.length, 4);
    assert.equal(boot.vehicleProfiles.length, 6);

    console.log('2. Testing Sylhet Safe-Route Engine & Keane Bridge Restriction...');
    // CNG from Bandar Bazar -> Humayun Rashid Chattar:
    // Normal shortcut goes via Sobhanighat (46cm flooded!) & Mendibagh (31cm flooded!) -> Shahjalal Bridge.
    // Keane Bridge is restricted for CNGs.
    // Safe route should detour via Kazir Bazar Bridge!
    const routeCngRes = await fetch(`${baseUrl}/api/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originId: 'bandarbazar',
        destinationId: 'humayun_rashid',
        vehicleId: 'cng'
      })
    });
    assert.equal(routeCngRes.status, 200);
    const routeCng = await routeCngRes.json();
    assert.equal(routeCng.ok, true);
    assert.equal(routeCng.samePath, false, 'CNG should detour away from flooded Sobhanighat');
    const cngRoads = routeCng.safeRoute.steps.map((s) => s.road);
    assert.ok(
      cngRoads.some((r) => r.includes('Kazir Bazar Bridge')),
      `Expected CNG safe route to cross Kazir Bazar Bridge, got: ${cngRoads.join(' -> ')}`
    );

    // Rickshaw from Surma Market -> Railway Station CAN cross Historic Keane Bridge!
    const routeRickshawRes = await fetch(`${baseUrl}/api/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originId: 'surma_market',
        destinationId: 'railway_station',
        vehicleId: 'rickshaw'
      })
    });
    const routeRickshaw = await routeRickshawRes.json();
    assert.equal(routeRickshaw.ok, true);
    assert.ok(
      routeRickshaw.safeRoute.steps.some((s) => s.isKeaneBridge),
      'Rickshaw should be permitted on Historic Keane Bridge'
    );

    console.log('3. Testing Report Creation & Coordinate Bounds Validation...');
    const badCoordRes = await fetch(`${baseUrl}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Outside Sylhet',
        lat: 23.8103, // Dhaka
        lng: 90.4125
      })
    });
    assert.equal(badCoordRes.status, 400);

    const createRes = await fetch(`${baseUrl}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Sudden Drain Overflow at Chouhatta Point',
        category: 'waterlogging',
        severity: 'high',
        waterDepthCm: 32,
        ward: 'Ward 1',
        areaName: 'Chouhatta Shaheed Minar',
        lat: 24.8994,
        lng: 91.8693,
        description: 'Heavy rain pooling outside Central Shaheed Minar.',
        reporterName: 'Test Student'
      })
    });
    assert.equal(createRes.status, 201);
    const { report: created } = await createRes.json();
    assert.equal(created.waterDepthCm, 32);

    console.log('4. Testing Community Voting, Field Comments & SCC Moderator Controls...');
    const voteRes = await fetch(`${baseUrl}/api/reports/${created.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voteType: 'confirm', voterToken: 'tester-1' })
    });
    const { report: afterVote } = await voteRes.json();
    assert.equal(afterVote.confirmations, 2);

    const commentRes = await fetch(`${baseUrl}/api/reports/${created.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: 'Rickshaw Puller',
        message: 'Left lane passable near footpath.',
        isOfficial: false
      })
    });
    assert.equal(commentRes.status, 201);
    const { report: afterComment } = await commentRes.json();
    assert.equal(afterComment.comments.length, 1);

    const adminRes = await fetch(`${baseUrl}/api/reports/${created.id}/admin`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verifiedOfficial: true, crewDispatched: true, status: 'monitoring' })
    });
    const { report: afterAdmin } = await adminRes.json();
    assert.equal(afterAdmin.verifiedOfficial, true);
    assert.equal(afterAdmin.crewDispatched, true);
    assert.equal(afterAdmin.status, 'monitoring');

    console.log('5. Testing Monsoon Scenario Simulator & Open Data Exports...');
    const scenRes = await fetch(`${baseUrl}/api/hydrology/scenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId: 'flash_flood_2022' })
    });
    assert.equal(scenRes.status, 200);
    const scenData = await scenRes.json();
    assert.equal(scenData.hydrology.scenarioId, 'flash_flood_2022');
    assert.ok(scenData.hydrology.gauges[0].currentLevelM > 11.0);

    const csvRes = await fetch(`${baseUrl}/api/export/csv`);
    assert.equal(csvRes.status, 200);
    const csvText = await csvRes.text();
    assert.ok(csvText.includes('Sobhanighat'));

    console.log('✅ All Sylhet Live API, Database & Routing Engine tests passed!');
  } finally {
    httpServer.close();
    for (const ext of ['', '-wal', '-shm']) {
      if (fs.existsSync(testDbPath + ext)) fs.unlinkSync(testDbPath + ext);
    }
  }
}

runTests().catch((err) => {
  console.error('❌ Test failure:', err);
  process.exit(1);
});
