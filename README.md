# 🌊 Sylhet Live — Waterlogging & Road Hazard Map (`সিলেট লাইভ`)

A real-time, crowdsourced civic GIS command platform for **Sylhet City Corporation (SCC)** designed to track monsoon street waterlogging, Surma River & *chara* drainage levels, submerged road hazards, and vehicle-specific flood-safe detours.

---

## 📌 Problem Statement & Motivation

Situated downstream of the Meghalaya hills (Cherrapunji — the wettest place on Earth), **Sylhet** experiences sudden monsoon cloudbursts and rapid rises in the **Surma River**. When river levels approach the **10.80 m BWDB Danger Level** at Chandni Ghat or when natural drainage streams (*Goalichara, Malnichara, Gaviyarchara*) congest, low-lying neighborhoods such as **Shahjalal Upashahar, Sobhanighat, Mendibagh, Taltola, Sheikhghat, and Pathantula–Madina Market** submerge within minutes.

Commuters, SUST/MC College students, CNG auto-rickshaw drivers, and emergency ambulances face three acute risks:
1. **Engine Stalling & Stranding**: Low-intake vehicles (especially CNG auto-rickshaws and sedans) stall in >20–25 cm water.
2. **Unseen Lethal Street Hazards**: Uncovered manholes, open RCC storm-drain trenches, and deep asphalt craters hidden beneath muddy floodwater.
3. **Lack of Hyperlocal Corridor Intelligence**: Standard navigation maps do not model real-time water depth (`cm`), vehicle wading clearance, or local bridge rules (such as **Historic Keane Bridge** being restricted to rickshaws and pedestrians only).

**Sylhet Live** solves this with live citizen crowdsourcing, municipal verification, hydrological telemetry, and a hazard-aware Dijkstra routing engine.

---

## ✨ Key Features

- **Interactive Multi-Layer Sylhet GIS Map (Leaflet)**
  - 3 switchable map themes (*Dark Command*, *Daylight Street*, *Detailed OpenStreetMap*)
  - Custom animated SVG hazard pins with live water-depth badges (`cm`) and official SCC verification ticks
  - Toggleable overlays: **Flood-Prone Basin Polygons**, **Surma River & Natural Chara Channels**, **Emergency Shelters & Hospitals**, and **Sylhet Arterial Road Graph**
- **Smart Vehicle Passability & Flood-Safe Route Engine**
  - 36 real Sylhet intersections & 48 road corridors across North Sylhet & South Surma
  - 6 calibrated vehicle profiles (`Pedestrian`, `Rickshaw`, `CNG Auto-Rickshaw`, `Motorbike`, `Private Car`, `Ambulance / SUV`)
  - Enforces **Historic Keane Bridge** light-vehicle-only restrictions while dynamically routing around flooded corridors via **Kazir Bazar Bridge**, **Shahjalal Bridge**, or elevated links
  - Visualizes **Safe Recommended Route** alongside **Avoided Flooded Shortcut** on the map with turn-by-turn steps
- **Crowdsourced Reporting & Community Verification**
  - Pin-on-map coordinate picker, Sylhet landmark presets, or browser GPS
  - Client-side photo upload & compression, interactive water-depth slider (`0–90 cm`), and automatic severity suggestion
  - Community `Still Here (+1)` & `Road Cleared` consensus voting + live commuter field-update comment threads
- **Surma Basin Hydrology & Interactive Monsoon Simulator**
  - Tracks **Surma (Sylhet Chandni Ghat & Kanairghat)**, **Kushiyara (Amalshid)**, and **Sari-Gowain** 24-hour hydrographs against BWDB Danger Levels, plus **Cherrapunji** upstream rainfall
  - Interactive **Monsoon Scenario Simulator** (*Clear Recovery*, *Live Monsoon Surge*, *65 mm/hr Urban Cloudburst*, *2022-Scale Flash Flood*) for testing and academic viva demonstrations
- **Ward Analytics, Emergency SOS & SCC Municipal Control Console**
  - Ward-by-ward severity matrix and downloadable **CSV / JSON Open Civic Datasets**
  - 1-click Emergency Hotlines (`999`, `16999` BPDB live-wire shutoff, `1090` Flood Warning, Osmani Medical, Fire Service Taltola) & Flood Shelter locator
  - **SCC Moderator Console** to verify reports officially, dispatch drainage crews, update statuses, and broadcast city-wide emergency banners
  - Full **English (`EN`) / বাংলা (`বাং`)** bilingual interface & **Real-Time Server-Sent Events (SSE)** synchronization

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Leaflet GIS, Lucide Icons |
| **Backend** | Node.js (v22+), Express.js, Server-Sent Events (`/api/events`) |
| **Database** | Built-in `node:sqlite` (`DatabaseSync` with WAL mode — zero native build dependencies) |
| **Routing Engine** | Custom Haversine Segment-Proximity + Hazard-Weighted Dijkstra Graph Engine |
| **Build & Tooling** | Vite 6, Unified Dev/Prod Server |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js v22.5+** (uses Node's built-in `node:sqlite` module)

### Installation & Development
```bash
# 1. Install dependencies
npm install

# 2. Start unified Express API + Vite HMR server (http://0.0.0.0:3000)
npm run dev
```

### Production Build & Run
```bash
npm run build
npm start
```

### Run Automated Integration Tests
```bash
npm test
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health & active hazard count |
| `GET` | `/api/bootstrap` | Initial reports, river hydrology, Sylhet road graph, shelters & vehicle profiles |
| `GET` | `/api/events` | Real-time Server-Sent Events (SSE) live update stream |
| `GET` | `/api/reports` | List all crowdsourced & official hazard reports |
| `POST` | `/api/reports` | Create a new Sylhet waterlogging or road hazard report |
| `POST` | `/api/reports/:id/vote` | Cast/toggle `confirm` or `clear` community verification vote |
| `POST` | `/api/reports/:id/comments` | Post a commuter or official SCC field update |
| `PATCH` | `/api/reports/:id/admin` | SCC Moderator actions (`verifiedOfficial`, `crewDispatched`, `status`) |
| `DELETE` | `/api/reports/:id` | Delete a report (Moderator) |
| `POST` | `/api/route` | Compute Safe vs Standard Sylhet route (`originId`, `destinationId`, `vehicleId`) |
| `POST` | `/api/hydrology/scenario` | Switch hydrological scenario (`live_monsoon`, `dry_normal`, `cloudburst_65mm`, `flash_flood_2022`) |
| `PATCH` | `/api/hydrology/banner` | Broadcast city-wide emergency advisory banner |
| `GET` | `/api/export/csv` | Export Sylhet hazard dataset as CSV |
| `GET` | `/api/export/json` | Export full telemetry & reports as JSON |
