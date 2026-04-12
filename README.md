# Thelawala

Thelawala is a real-time vendor discovery platform that connects local buyers with moving street vendors.

This repository contains:
- `thelawala-server`: Node.js + Express + Socket.io backend
- `thelawala-user`: React Native (Expo) buyer app
- `thelawala-vendor`: React Native (Expo) vendor app with AUJAR/BLE location integration path

The system supports:
- Live vendor location broadcast
- Nearby vendor discovery
- Item-based and vendor-based search
- Buyer-to-vendor request flow with accept/reject in real time
- Vendor inventory management

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Repository Structure](#repository-structure)
4. [How Data Flows](#how-data-flows)
5. [Prerequisites](#prerequisites)
6. [Quick Start (Local Development)](#quick-start-local-development)
7. [Server Setup](#server-setup)
8. [User App Setup](#user-app-setup)
9. [Vendor App Setup](#vendor-app-setup)
10. [Runtime Server IP Configuration](#runtime-server-ip-configuration)
11. [API and Socket Contracts](#api-and-socket-contracts)
12. [Environment Variables](#environment-variables)
13. [Testing Guide](#testing-guide)
14. [Contributing Guide](#contributing-guide)
15. [Codebase Conventions](#codebase-conventions)
16. [Troubleshooting](#troubleshooting)

---

## Project Overview

Street vendors are hard to discover at the exact time and place buyers need them. Thelawala solves this by combining:
- A real-time backend (Socket.io)
- A buyer app that discovers and requests vendors
- A vendor app that broadcasts location and manages inventory

### Goals

- Make nearby vendors discoverable on a live map
- Let buyers request specific items
- Let vendors accept/reject requests immediately
- Keep the system practical for field usage (phone GPS now, AUJAR BLE pipeline for hardware mode)

---

## Architecture

High-level architecture:

- Mobile apps talk to server through REST and Socket.io
- Server stores vendors/clients/inventory in MongoDB
- Vendor location updates are pushed to server and used for nearby filtering

Flow summary:
1. Vendor logs in and starts broadcasting location.
2. Buyer asks server for nearby vendors using current location.
3. Buyer sends item request to selected vendor.
4. Vendor accepts or rejects.
5. Buyer receives decision and vendor location pin when accepted.

---

## Repository Structure

```text
Thelawala/
|-- CONCEPT_DESIGN.md
|-- SYSTEM_DESIGN.md
|-- README.md
|-- thelawala-server/
|   |-- package.json
|   |-- README.md
|   |-- .env
|   `-- src/
|       |-- index.js
|       |-- app.js
|       |-- socket.js
|       |-- config/
|       |   `-- db.js
|       |-- middleware/
|       |   `-- auth.js
|       |-- models/
|       |   |-- Vendor.js
|       |   `-- Client.js
|       `-- routes/
|           |-- auth.js
|           |-- vendor.js
|           `-- search.js
|-- thelawala-user/
|   |-- app.json
|   |-- App.tsx
|   |-- package.json
|   |-- src/
|   |   |-- types.ts
|   |   |-- navigation/
|   |   |   `-- AppNavigator.tsx
|   |   |-- screens/
|   |   |   |-- LoginScreen.tsx
|   |   |   |-- HomeScreen.tsx
|   |   |   `-- ServerConfigScreen.tsx
|   |   |-- components/
|   |   |   |-- SearchPanel.tsx
|   |   |   `-- VendorSheet.tsx
|   |   `-- services/
|   |       |-- api.ts
|   |       `-- serverConfig.ts
|   `-- android/
`-- thelawala-vendor/
    |-- app.json
    |-- App.tsx
    |-- package.json
    |-- src/
    |   |-- navigation/
    |   |   `-- AppNavigator.tsx
    |   |-- screens/
    |   |   |-- LoginScreen.tsx
    |   |   |-- HomeScreen.tsx
    |   |   `-- ServerConfigScreen.tsx
    |   |-- components/
    |   |   |-- InventorySection.tsx
    |   |   `-- MapSection.tsx
    |   |-- hooks/
    |   |   `-- useAujarBluetooth.ts
    |   `-- services/
    |       |-- api.ts
    |       `-- serverConfig.ts
    `-- android/
```

### What each major area does

- `thelawala-server/src/index.js`: boots Express + HTTP + Socket + DB
- `thelawala-server/src/app.js`: middleware and route mounting
- `thelawala-server/src/socket.js`: all real-time events and routing logic
- `thelawala-server/src/routes/*`: auth, inventory, and search REST APIs
- `thelawala-server/src/models/*`: MongoDB schemas + password helpers

- `thelawala-user/src/screens/HomeScreen.tsx`: buyer map, search, nearby list, item requests
- `thelawala-user/src/services/api.ts`: buyer REST calls + socket lifecycle
- `thelawala-user/src/services/serverConfig.ts`: runtime server URL storage and retrieval

- `thelawala-vendor/src/screens/HomeScreen.tsx`: inventory, request handling, broadcast control
- `thelawala-vendor/src/hooks/useAujarBluetooth.ts`: BLE/GPS location source integration
- `thelawala-vendor/src/components/MapSection.tsx`: vendor location map rendering
- `thelawala-vendor/src/services/api.ts`: vendor REST calls + socket lifecycle
- `thelawala-vendor/src/services/serverConfig.ts`: runtime server URL storage and retrieval

---

## How Data Flows

### Buyer side

1. Buyer logs in (REST auth).
2. Buyer socket connects with JWT.
3. Buyer sends `get_nearby_vendors` with current lat/lng.
4. Server filters broadcasting vendors by radius and returns results.
5. Buyer sends `send_item_request` to a vendor.
6. Buyer receives `request_decision` event.

### Vendor side

1. Vendor logs in (REST auth).
2. Vendor socket connects with JWT.
3. Vendor app emits `vendor_location_update` periodically while broadcasting.
4. Vendor receives `incoming_request`.
5. Vendor emits `request_decision` with accepted/rejected.

---

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB (local or cloud URI)
- Android Studio (for native Android builds)
- Java/JDK compatible with React Native Android build
- Physical Android device recommended for BLE/AUJAR path

Optional but useful:
- `adb` in PATH
- Expo CLI (`npx expo` is enough in most cases)

---

## Quick Start (Local Development)

Open 3 terminals:

1. Start server
```bash
cd thelawala-server
npm install
npm run dev
```

2. Start buyer app
```bash
cd thelawala-user
npm install
npm start
```

3. Start vendor app
```bash
cd thelawala-vendor
npm install
npm start
```

Then in each app, set server URL from in-app Server Settings screen.

---

## Server Setup

```bash
cd thelawala-server
npm install
npm run dev
```

Production start:
```bash
npm start
```

Server entry points:
- HTTP and socket boot: `src/index.js`
- REST routes: `src/routes/*`
- Socket events: `src/socket.js`

---

## User App Setup

```bash
cd thelawala-user
npm install
npm start
```

Native Android run:
```bash
npm run android
```

Core buyer files:
- `src/screens/LoginScreen.tsx`
- `src/screens/HomeScreen.tsx`
- `src/components/SearchPanel.tsx`
- `src/components/VendorSheet.tsx`
- `src/services/api.ts`

---

## Vendor App Setup

```bash
cd thelawala-vendor
npm install
npm start
```

Native Android run:
```bash
npm run android
```

Release APK (local):
```bash
cd android
gradlew.bat assembleRelease
```

APK output:
- `thelawala-vendor/android/app/build/outputs/apk/release/app-release.apk`

Core vendor files:
- `src/screens/LoginScreen.tsx`
- `src/screens/HomeScreen.tsx`
- `src/components/InventorySection.tsx`
- `src/components/MapSection.tsx`
- `src/hooks/useAujarBluetooth.ts`
- `src/services/api.ts`

---

## Runtime Server IP Configuration

Both mobile apps now support runtime server URL configuration.

Behavior:
- On first app launch, Server Settings screen appears.
- Enter URL like:
  - `http://172.16.216.70:5000`
  - or `172.16.216.70:5000` (auto-normalized)
- URL is persisted locally.
- You can change it later from login screen via "Change Server IP".

Files:
- Buyer: `thelawala-user/src/services/serverConfig.ts`
- Vendor: `thelawala-vendor/src/services/serverConfig.ts`

---

## API and Socket Contracts

### REST

- `POST /api/auth/vendor/login`
- `POST /api/auth/vendor/register`
- `POST /api/auth/client/login`
- `POST /api/auth/client/register`
- `GET /api/vendor/inventory` (vendor token)
- `POST /api/vendor/inventory` (vendor token)
- `GET /api/search/vendor/:id`
- `GET /api/search/item/:itemName`

### Socket events

Vendor to server:
- `vendor_location_update` `{ lat, lng }`
- `vendor_stop_broadcast`
- `request_decision` `{ clientId, decision, vendorLocation? }`

Buyer to server:
- `get_nearby_vendors` `{ lat, lng, radiusKm }`
- `send_item_request` `{ vendorId, itemName, clientLocation }`

Server to vendor:
- `incoming_request`

Server to buyer:
- `request_decision`

---

## Environment Variables

Server `.env` (`thelawala-server/.env`):

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/thelawala
JWT_SECRET=change_this_to_a_strong_random_secret_in_production
```

Production notes:
- Always set a strong `JWT_SECRET`
- Use managed MongoDB (Atlas) or secured self-hosted DB
- Restrict CORS origins (currently broad)

---

## Testing Guide

### Basic functional test

1. Start server and confirm `GET /` returns status ok.
2. Register vendor and buyer.
3. Vendor adds inventory.
4. Vendor starts broadcasting.
5. Buyer fetches nearby vendors.
6. Buyer sends item request.
7. Vendor accepts/rejects.
8. Buyer receives decision.

### AUJAR/BLE test path

1. Install vendor app as native Android build (not Expo Go).
2. Connect AUJAR/BLE source.
3. Use "CONNECT TO AUJAR" in vendor app.
4. Start broadcasting and inspect server logs for location updates.

---

## Contributing Guide

### Branching

- Create feature branch from `main`
- Naming recommendation:
  - `feat/<short-topic>`
  - `fix/<short-topic>`
  - `docs/<short-topic>`

### Commit style (recommended)

- `feat: add server config setup screen`
- `fix: prevent stale socket on server url change`
- `docs: expand repository onboarding`

### Pull requests

Include:
- What changed
- Why it changed
- How it was tested
- Screenshots/GIF for UI changes
- Any migration or config notes

### Before opening PR

- Ensure apps run locally
- Verify key flow (auth -> broadcast -> nearby -> request)
- Keep changes scoped and avoid unrelated refactors

---

## Codebase Conventions

- TypeScript in mobile apps, JavaScript in server
- Keep API wrappers inside `src/services`
- Keep screen UI logic in `src/screens`
- Prefer small, reusable components in `src/components`
- Avoid hardcoded IPs in code; use runtime config services
- Keep socket cleanup explicit on screen unmount

---

## Troubleshooting

### Mobile app cannot reach server

- Verify phone and laptop are on same Wi-Fi
- Confirm server URL in app settings includes port `:5000`
- Check Windows firewall inbound rule for port 5000
- Confirm server process is running

### Buyer sees no nearby vendors

- Vendor must be logged in and broadcasting
- Vendor location must be updating
- Buyer location permission must be granted
- Radius defaults may exclude far vendor

### BLE/AUJAR not connecting

- Use native app build, not Expo Go
- Ensure Bluetooth/location permissions granted on Android
- Ensure AUJAR advertises expected service UUID

### Android release install conflict

If install fails due to signature mismatch:
```bash
adb uninstall com.prototype.thelawalavendor
```
Then reinstall APK.

---

## Additional Docs

- Concept details: `CONCEPT_DESIGN.md`
- System design deep dive: `SYSTEM_DESIGN.md`
- Server-specific guide: `thelawala-server/README.md`

---

## Maintainers

If you are taking over this repo, first read in this order:
1. `README.md`
2. `SYSTEM_DESIGN.md`
3. `thelawala-server/src/socket.js`
4. Buyer and vendor `src/screens/HomeScreen.tsx`

This will give you the fastest understanding of core behavior and integration points.
