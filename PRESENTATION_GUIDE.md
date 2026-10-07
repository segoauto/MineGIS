# MineGIS Telangana — Executive Panel Presentation Guide

> **Project Name**: MineGIS Telangana — Geospatial & Telematics Mineral Administration Platform  
> **Deployment URL**: [https://miningts.segoauto.com](https://miningts.segoauto.com)  
> **Target Audience**: Department of Mines & Geology, District Mining Officers (ADMGs), Technical Evaluation Panel  
> **Demo Time**: 5 to 7 Minutes

---

## 🎯 Executive Pitch (30-Second Hook)

> *"Respected Panel, **MineGIS Telangana** is an enterprise-grade Geospatial Intelligence & IoT Telematics Platform designed to solve three critical challenges for the Department of Mines & Geology:*
> 1. ***Illegal Mining & Over-Excavation Detection*** *using Sentinel-2 satellite spectral indices (NDVI & NDWI).*
> 2. ***Mineral Transit Leakage & Royalty Evasion Prevention*** *using live GPS fleet tracking with automated boundary geofences.*
> 3. ***Environmental & Regulatory Compliance*** *through real-time spatial buffer analysis against forest reserves and water bodies."*

---

## 🧭 Live Demo Script — Step-by-Step Flow

### Step 1: Statewide Cadastral & Mineral Concessions (1 min)
1. **Open**: [https://miningts.segoauto.com](https://miningts.segoauto.com)
2. **Showcase**:
   - 815 verified mining leases plotted with precise DGPS cadastral coordinates across all 33 Telangana districts.
   - Radiant beacons that ensure every concession is visible even at statewide overview zoom.
3. **Click "Minerals" button** on the top-right toolbar:
   - Toggle specific categories (e.g., *Black Granite*, *Colour Granite*, *Limestone*, *Quartz*, *Feldspar*).
   - Show how the map instantly filters and highlights specific mineral clusters.
4. **Talking Point**:
   > *"Every sanctioned lease is digitized with verified survey numbers. Officers can instantly isolate specific mineral groups to analyze revenue generation and concession density across any mandal or district."*

---

### Step 2: The Core Differentiator — Sentinel-2 Spectral Swipe Comparison (2 mins)
1. **Click "Swipe" button** on the top toolbar:
   - Left side: **🌱 Sentinel-2 NDVI Spectral Overlay** (Vegetation & Pit Loss)
   - Right side: **Standard Base Map**
2. **Action**:
   - Drag the center circular slider across an active quarry area.
   - Point out the **Color Scale Legend** in the bottom-left corner:
     - 🟢 **Lush Green**: Healthy vegetation, forests, and agricultural canopy.
     - 🔴 **Crimson Red / Orange**: Active open-cast quarry pits, extraction cores, and barren rock devoid of vegetation.
     - 🔵 **Deep Navy / Blue**: Water reservoirs and drainage bodies.
3. **Switch the Dropdown**:
   - Select **💧 Sentinel-2 NDWI (Water & Sump Index)**: Highlights pit sump retention pools and drainage canals.
   - Select **🔥 Color Infrared (B8-B4-B3 CIR)**: Vegetation glows ruby-red, bare rock appears crisp cyan/white.
4. **Talking Point**:
   > *"Traditionally, detecting illegal pit expansion required hazardous physical inspections. With our Sentinel-2 spectral engine, we compare sanctioned lease polygons against live vegetation index data. When crimson red excavation signatures cross outside the yellow sanctioned boundary, the system flags immediate evidence of illegal over-excavation."*

---

### Step 3: Interactive Inspector Spyglass — Magnifier (1 min)
1. **Click "Magnifier" button** on the top toolbar:
   - A circular spyglass lens appears with target crosshairs and live lat/long coordinates.
2. **Move Cursor**:
   - Hover over quarry pits to inspect them at **+1.8x optical magnification**.
   - Switch the lens view between **NDVI**, **High-Res Satellite**, and **Topographic Contours**.
3. **Talking Point**:
   > *"Our inspector lens allows officers to maintain high-level situational awareness across the entire district while simultaneously performing micro-level bench and pit examinations without losing their map context."*

---

### Step 4: Environmental & Regulatory Proximity — Buffer Analysis (1 min)
1. **Click "Buffer" button**:
   - Set radius to **1.0 km** or **2.5 km**.
   - Click **"Click Map to Set Center"** and click near a river body or eco-sensitive zone.
   - Watch the Turf.js spatial circle draw on the canvas and populate the table of intersecting quarries with direct **Zoom-To** buttons.
2. **Talking Point**:
   > *"Under NGT and Supreme Court environmental directives, mining within statutory buffer zones of rivers and forest reserves is strictly restricted. This automated Proximity Engine calculates compliance in milliseconds, listing every concession violating statutory buffer zones."*

---

### Step 5: IoT Mineral Transit & Geofence Intelligence (1 min)
1. **Click on a moving vehicle marker** (e.g., `TS05UE0999` or `TS05UE3699`):
   - Show the **Breadcrumb Polyline Trail** left behind as the mineral tipper navigates transit corridors.
   - Show the **Automated Geofence Boundary Alert** and trip status linked to e-Permit/e-Transit pass.
2. **Talking Point**:
   > *"Satellite imagery monitors the extraction pit; our telematics engine monitors the transit route. If a tipper departs an authorized mineral corridor or stops outside a weighbridge checkpoint, automated alerts notify enforcement squads in real time."*

---

### Step 6: Executive Analytics & Royalty Reconciliation (30 secs)
1. **Click "Analytics" button**:
   - Present the **District & Mandal KPI breakdown** (Total Active Leases, Cumulative Extent in Hectares, Production vs. Dispatch vs. ETS Royalty volume).
2. **Talking Point**:
   > *"For the Directorate and IT Secretary, this reconciles field telematics with treasury collection, cross-verifying reported dispatch volumes against physical truck weight to prevent royalty evasion."*

---

## 🛡️ Anticipated Panel Questions & Answers

| Potential Question | Your Winning Answer |
| :--- | :--- |
| **"Where does the satellite imagery come from? Is it costly?"** | *"It utilizes European Space Agency (ESA) Copernicus Sentinel-2 L2A constellations with 10-meter spatial resolution and 5-day revisit cycles. Because Sentinel-2 data is open-access, the state incurs zero proprietary satellite license fees."* |
| **"Can a District Officer from Karimnagar tamper with records from Warangal?"** | *"No. The platform enforces strict Role-Based Access Control (RBAC). District Mining Officers (ADMGs) are automatically locked to their respective administrative boundaries, while the Directorate retains statewide oversight."* |
| **"What happens if there is poor mobile internet in deep quarry pits?"** | *"The telematics devices feature onboard offline flash memory buffering. When out of cellular coverage, GPS pings and trail breadcrumbs are stored locally and synchronized as soon as the vehicle passes an RFID toll or reaches cellular coverage."* |
| **"How fast can an illegal lease encroachment report be generated?"** | *"Instantaneously. The spatial query engine runs client-side vector algebra combined with PostGIS spatial indices, delivering proximity and boundary violation outputs in under 200 milliseconds."* |

---

## 📋 60-Second Pre-Demo Checklist

1. [ ] Open **[https://miningts.segoauto.com](https://miningts.segoauto.com)** in a clean, maximized browser window.
2. [ ] Log in with `admin@minegis.telangana.gov.in` (password `Admin@123456`) or use Quick Admin Demo Login.
3. [ ] Click **"Swipe"** once to ensure the NDVI green/red spectral layer loads smoothly.
4. [ ] Set browser zoom to 90% or 100% for optimal widescreen visibility.
