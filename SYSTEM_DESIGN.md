# Thelawala — System Design Document

> **A real-time marketplace connecting street vendors (thelawalas) with local buyers.**

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Component Breakdown](#3-component-breakdown)
4. [Data Models](#4-data-models)
5. [API Design](#5-api-design)
6. [Real-Time Communication (Socket.io)](#6-real-time-communication-socketio)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Core User Flows](#8-core-user-flows)
9. [Geolocation & Proximity](#9-geolocation--proximity)
10. [State Management](#10-state-management)
11. [Technology Stack](#11-technology-stack)
12. [Design Decisions & Trade-offs](#12-design-decisions--trade-offs)

---

## 1. System Overview

Thelawala is a three-part system that enables **real-time discovery and communication** between street vendors and buyers:

| Component | Role | Platform |
|-----------|------|----------|
| **thelawala-server** | Central API + real-time relay | Node.js / Express / Socket.io / MongoDB |
| **thelawala-user** | Buyer mobile app | React Native (Expo) — TypeScript |
| **thelawala-vendor** | Vendor mobile app | React Native (Expo) — TypeScript |

**Core value proposition:** A buyer opens the app, sees nearby live vendors on a map, browses their inventory, and sends an item request. The vendor receives the request in real time, accepts or rejects it, and if accepted, both parties see each other's location on the map.

---

## 2. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        THELAWALA ECOSYSTEM                          │
└──────────────────────────────────────────────────────────────────────┘

  ┌─────────────────┐                         ┌─────────────────┐
  │  BUYER APP      │                         │  VENDOR APP     │
  │  (thelawala-    │                         │  (thelawala-    │
  │   user)         │                         │   vendor)       │
  │                 │                         │                 │
  │  ┌───────────┐  │                         │  ┌───────────┐  │
  │  │ Login     │  │                         │  │ Login     │  │
  │  │ Screen    │  │                         │  │ Screen    │  │
  │  └─────┬─────┘  │                         │  └─────┬─────┘  │
  │        ▼        │                         │        ▼        │
  │  ┌───────────┐  │                         │  ┌───────────┐  │
  │  │ Home      │  │                         │  │ Home      │  │
  │  │ Screen    │  │                         │  │ Screen    │  │
  │  │           │  │                         │  │           │  │
  │  │ • Map     │  │                         │  │ • Map     │  │
  │  │ • Search  │  │                         │  │ • Inventory│  │
  │  │ • Vendor  │  │                         │  │ • Requests│  │
  │  │   Sheet   │  │                         │  │ • AUJAR   │  │
  │  └─────┬─────┘  │                         │  └─────┬─────┘  │
  │        │        │                         │        │        │
  └────────┼────────┘                         └────────┼────────┘
           │                                           │
           │  REST (HTTP)        REST (HTTP)            │
           │  + Socket.io        + Socket.io            │
           │                                           │
           ▼                                           ▼
  ┌────────────────────────────────────────────────────────────┐
  │                    BRIDGE SERVER                           │
  │                 (thelawala-server)                         │
  │                                                            │
  │   ┌──────────┐  ┌──────────┐  ┌───────────────────────┐   │
  │   │  Express │  │ Socket.io│  │   In-Memory State     │   │
  │   │  REST    │  │  Server  │  │                       │   │
  │   │  API     │  │          │  │  activeSessions: Map  │   │
  │   │          │  │          │  │  pendingRequests: Map  │   │
  │   └────┬─────┘  └────┬─────┘  └───────────────────────┘   │
  │        │              │                                    │
  │        └──────┬───────┘                                    │
  │               ▼                                            │
  │        ┌─────────────┐                                     │
  │        │  MongoDB    │                                     │
  │        │  (Mongoose) │                                     │
  │        │             │                                     │
  │        │  • Vendors  │                                     │
  │        │  • Clients  │                                     │
  │        └─────────────┘                                     │
  └────────────────────────────────────────────────────────────┘
```

---

## 3. Component Breakdown

### 3.1 thelawala-server

The server is the central hub. It has **two communication channels**:

| Channel | Protocol | Purpose |
|---------|----------|---------|
| **REST API** | HTTP | Auth, inventory CRUD, search/discovery |
| **Socket.io** | WebSocket | Live GPS broadcast, request routing, presence |

**Source file mapping:**

| File | Responsibility |
|------|---------------|
| `index.js` | Entry point — creates HTTP server, initializes Socket.io, connects MongoDB |
| `app.js` | Express app — mounts middleware (CORS, JSON), routes, and health check |
| `socket.js` | Socket.io event handlers — GPS relay, request routing, session tracking |
| `config/db.js` | MongoDB connection via Mongoose |
| `middleware/auth.js` | JWT generation, verification, Express middleware |
| `models/Vendor.js` | Mongoose schema for vendors |
| `models/Client.js` | Mongoose schema for buyers |
| `routes/auth.js` | Login/register endpoints for both roles |
| `routes/vendor.js` | Inventory management endpoints |
| `routes/search.js` | Vendor/item search endpoints |

### 3.2 thelawala-user (Buyer App)

A mobile app for buyers to discover nearby vendors, browse inventory, and send item requests.

| File | Responsibility |
|------|---------------|
| `App.tsx` | Root — renders navigation |
| `navigation/AppNavigator.tsx` | Stack navigator: Login → Home |
| `screens/LoginScreen.tsx` | Phone/password auth with login/register |
| `screens/HomeScreen.tsx` | Map + vendor list + search + request flow |
| `components/SearchPanel.tsx` | Search by item name or thela ID |
| `components/VendorSheet.tsx` | Bottom sheet showing selected vendor's inventory |
| `services/api.ts` | REST client + Socket.io connection manager |
| `types.ts` | Shared TypeScript type definitions |

### 3.3 thelawala-vendor (Vendor App)

A mobile app for vendors to manage inventory, broadcast location, and respond to buyer requests.

| File | Responsibility |
|------|---------------|
| `App.tsx` | Root — renders navigation |
| `navigation/AppNavigator.tsx` | Stack navigator: Login → Home |
| `screens/LoginScreen.tsx` | ThelaId/password auth |
| `screens/HomeScreen.tsx` | Inventory + map + request handling |
| `components/InventorySection.tsx` | Add/edit/delete stock items |
| `components/MapSection.tsx` | Leaflet map with GPS markers + AUJAR connect |
| `hooks/useAujarBluetooth.ts` | GPS hardware abstraction (currently uses Expo Location) |
| `services/api.ts` | REST client + Socket.io connection manager |

---

## 4. Data Models

### 4.1 Vendor (MongoDB)

```
┌──────────────────────────────────────────────┐
│                   Vendor                     │
├──────────────────────────────────────────────┤
│ _id             : ObjectId                   │
│ thelaId         : String (unique)            │
│ passwordHash    : String (bcrypt)            │
│ isBroadcasting  : Boolean (default: false)   │
│ lastLocation    : { lat: Number, lng: Number}│
│ currentInventory: StockItem[]                │
│ createdAt       : Date                       │
│ updatedAt       : Date                       │
├──────────────────────────────────────────────┤
│ Methods:                                     │
│  .comparePassword(plain) → Boolean           │
│  Vendor.hashPassword(plain) → String         │
└──────────────────────────────────────────────┘
```

### 4.2 Client (MongoDB)

```
┌──────────────────────────────────────────────┐
│                   Client                     │
├──────────────────────────────────────────────┤
│ _id             : ObjectId                   │
│ phoneNumber     : String (unique)            │
│ passwordHash    : String (bcrypt)            │
│ createdAt       : Date                       │
│ updatedAt       : Date                       │
├──────────────────────────────────────────────┤
│ Methods:                                     │
│  .comparePassword(plain) → Boolean           │
│  Client.hashPassword(plain) → String         │
└──────────────────────────────────────────────┘
```

### 4.3 StockItem (Embedded Document)

```typescript
{
  id:       string   // UUID
  name:     string   // Item name (e.g., "Panipuri")
  quantity: number   // Available count
}
```

### 4.4 VendorInfo (Client-Side Type)

```typescript
{
  thelaId:   string
  vendorId:  string
  location:  { lat: number, lng: number }
  inventory: StockItem[]
  distance?: number  // km from buyer, computed client-side
}
```

---

## 5. API Design

### 5.1 Authentication Endpoints

```
POST /api/auth/vendor/register
  Request:  { thelaId: string, password: string }
  Response: { token: string, vendor: { thelaId, id } }
  Errors:   409 Conflict (duplicate thelaId)

POST /api/auth/vendor/login
  Request:  { thelaId: string, password: string }
  Response: { token: string, vendor: { thelaId, id } }
  Errors:   404 Not Found, 401 Unauthorized

POST /api/auth/client/register
  Request:  { phoneNumber: string, password: string }
  Response: { token: string, client: { phoneNumber, id } }
  Errors:   409 Conflict (duplicate phone)

POST /api/auth/client/login
  Request:  { phoneNumber: string, password: string }
  Response: { token: string, client: { phoneNumber, id } }
  Errors:   404 Not Found, 401 Unauthorized
```

### 5.2 Vendor Endpoints (Protected — requires Bearer token)

```
GET /api/vendor/inventory
  Response: { inventory: StockItem[] }

POST /api/vendor/inventory
  Request:  { inventory: StockItem[] }
  Response: { message: 'Inventory updated', vendor }
```

### 5.3 Search Endpoints (Public)

```
GET /api/search/vendor/:id
  Response: { status: 'broadcasting', thelaId, location, inventory }
         or { status: 'offline', message }

GET /api/search/item/:itemName
  Response: { results: VendorInfo[] }
  Notes:    Filters by isBroadcasting=true, case-insensitive name match
```

### 5.4 Health Check

```
GET /
  Response: { status: 'ok', service: 'Thelawala Bridge Server' }
```

---

## 6. Real-Time Communication (Socket.io)

Socket.io handles all real-time features: GPS broadcasting, vendor discovery, and item request routing.

### 6.1 Connection & Authentication

```
Client connects → Socket.io middleware intercepts
  → Reads socket.handshake.auth.token
  → Verifies JWT
  → Attaches decoded user to socket.data
  → Allows/rejects connection
```

### 6.2 Server-Side State (In-Memory)

| Structure | Type | Purpose |
|-----------|------|---------|
| `activeSessions` | `Map<userId, socketId>` | Track which users are currently connected |
| `pendingRequests` | `Map<vendorId, request[]>` | Queue requests for vendors who are temporarily offline |

### 6.3 Event Flow Diagram

```
    BUYER APP                     SERVER                      VENDOR APP
    ─────────                     ──────                      ──────────

                                              vendor_location_update
                                  ◄──────────────────────────── { lat, lng }
                                  │
                                  │  Updates DB:
                                  │  isBroadcasting = true
                                  │  lastLocation = { lat, lng }
                                  │

  get_nearby_vendors ────────────►│
  { lat, lng, radiusKm: 5 }      │
                                  │  Query: isBroadcasting=true
                                  │  Filter: within radius (Haversine)
                                  │
  callback(vendors[]) ◄───────────│


  send_item_request ─────────────►│
  { vendorId, itemName,           │
    clientLocation }              │  Lookup vendorId in activeSessions
                                  │
                                  │  ┌─ Online? ──► incoming_request ──────►
                                  │  │              { clientId, itemName,
                                  │  │                clientLocation }
                                  │  │
                                  │  └─ Offline? ─► pendingRequests.push()


                                  │              request_decision ◄─────────
                                  │              { clientId, decision,
                                  │                vendorLocation }
                                  │
  request_decision ◄──────────────│
  { vendorId, decision,           │
    vendorLocation }              │


                                              vendor_stop_broadcast
                                  ◄──────────────────────────── (none)
                                  │
                                  │  Updates DB:
                                  │  isBroadcasting = false
```

### 6.4 Complete Event Reference

#### Events Emitted by Buyer App

| Event | Payload | Response |
|-------|---------|----------|
| `get_nearby_vendors` | `{ lat, lng, radiusKm }` | Callback with `VendorInfo[]` |
| `send_item_request` | `{ vendorId, itemName, clientLocation }` | Triggers `incoming_request` on vendor |

#### Events Emitted by Vendor App

| Event | Payload | Effect |
|-------|---------|--------|
| `vendor_location_update` | `{ lat, lng }` | DB update + makes vendor discoverable |
| `vendor_stop_broadcast` | — | DB update: `isBroadcasting = false` |
| `request_decision` | `{ clientId, decision, vendorLocation }` | Routed to buyer's socket |

#### Events Received by Buyer App

| Event | Payload | UI Effect |
|-------|---------|-----------|
| `request_decision` | `{ vendorId, decision, vendorLocation }` | Shows accept/reject banner, pins vendor on map |

#### Events Received by Vendor App

| Event | Payload | UI Effect |
|-------|---------|-----------|
| `incoming_request` | `{ clientId, itemName, clientLocation }` | Alert dialog with Accept/Reject |

---

## 7. Authentication & Authorization

### 7.1 Token Structure

```javascript
// JWT Payload
{
  id: ObjectId,           // MongoDB document ID
  thelaId | phoneNumber,  // Identifier based on role
  role: 'vendor' | 'client'
}

// Expiry: 7 days
// Secret: process.env.JWT_SECRET
```

### 7.2 Auth Flow

```
┌────────────────┐     POST /api/auth/{role}/login     ┌────────────────┐
│   Mobile App   │ ──────────────────────────────────► │   REST API     │
│                │                                      │                │
│                │ ◄─────────────── { token, user } ── │  Validate pwd  │
│                │                                      │  Generate JWT  │
│  Store token   │                                      └────────────────┘
│  in memory     │
│                │     socket.connect({ auth: token })  ┌────────────────┐
│                │ ──────────────────────────────────► │  Socket.io     │
│                │                                      │  Middleware     │
│                │ ◄── connection accepted ──────────── │  Verify JWT    │
└────────────────┘                                      └────────────────┘
```

### 7.3 Protected Routes

The `authMiddleware` extracts the token from the `Authorization: Bearer <token>` header, verifies it, and attaches the decoded user to `req.user`. Applied to:

- `POST /api/vendor/inventory`
- `GET /api/vendor/inventory`

### 7.4 Password Security

- Hashed with **bcrypt** (10 salt rounds) before storage
- Compared via `bcrypt.compare()` on login
- Plain-text passwords never stored or logged

---

## 8. Core User Flows

### 8.1 Vendor Goes Live

```
1. Vendor logs in → receives JWT
2. Loads saved inventory from server
3. Adds/edits items as needed (auto-syncs to server)
4. Taps "Connect to AUJAR" → starts GPS tracking
5. GPS updates flow to server via socket:
     vendor_location_update → every location change
6. Server sets isBroadcasting=true + updates lastLocation
7. Vendor is now discoverable by nearby buyers
8. On disconnect → vendor_stop_broadcast → isBroadcasting=false
```

### 8.2 Buyer Discovers Vendors

```
1. Buyer logs in → receives JWT
2. App requests location permission → gets GPS
3. Connects socket with JWT
4. Emits get_nearby_vendors every 15 seconds
5. Server queries MongoDB for broadcasting vendors within 5km
6. Returns list sorted by distance
7. Map renders vendor markers (red blips)
8. Buyer taps marker → opens VendorSheet with inventory
```

### 8.3 Item Request Flow

```
1. Buyer opens VendorSheet → sees inventory
2. Taps "Request" on an item
3. App emits send_item_request { vendorId, itemName, clientLocation }
4. Server routes to vendor socket (or queues if offline)
5. Vendor sees alert: "Buyer wants [item] — [distance] away"
6. Vendor taps Accept or Reject
7. Vendor emits request_decision { clientId, decision, vendorLocation }
8. Server routes to buyer socket
9. If accepted:
     - Buyer sees green pin on map at vendor's location
     - Banner: "Vendor accepted! Head to the pin."
10. If rejected:
     - Buyer sees rejection alert
```

### 8.4 Search Flow

```
Search by Item:
  1. Buyer types item name in SearchPanel
  2. REST call: GET /api/search/item/:itemName
  3. Server queries isBroadcasting=true vendors
  4. Filters by inventory item name (case-insensitive)
  5. Returns matching vendors with location + inventory

Search by Thela ID:
  1. Buyer types vendor's thelaId
  2. REST call: GET /api/search/vendor/:id
  3. Returns vendor info if broadcasting, or "offline" status
```

---

## 9. Geolocation & Proximity

### 9.1 GPS Sources

| App | GPS Source | Config |
|-----|-----------|--------|
| Buyer | `expo-location` | Accuracy: Highest, interval: 10s, distance: 20m |
| Vendor | `useAujarBluetooth` hook (wraps `expo-location`) | Accuracy: Highest, interval: 5s, distance: 1m |

The vendor's more aggressive GPS settings (5s interval, 1m threshold) ensure buyers always see an accurate position.

### 9.2 Haversine Distance Calculation

Both the server and client apps use the **Haversine formula** to compute distance between two GPS coordinates:

```
a = sin²(Δlat/2) + cos(lat₁) · cos(lat₂) · sin²(Δlng/2)
c = 2 · atan2(√a, √(1−a))
d = R · c

where R = 6371 km (Earth's radius)
```

**Used in:**
- **Server** (`socket.js`): Filter vendors within buyer's radius
- **Buyer App**: Sort vendors by distance
- **Vendor App**: Show buyer's distance in request alert

### 9.3 Proximity Discovery

- Default search radius: **5 km**
- Buyer polls nearby vendors every **15 seconds**
- Only `isBroadcasting = true` vendors are returned
- Results sorted by ascending distance

---

## 10. State Management

Both apps use **React component state** (`useState` + `useEffect`) — no external state management library.

### 10.1 Buyer App State (HomeScreen)

```
┌─────────────────────────────────┐
│          HomeScreen State       │
├─────────────────────────────────┤
│ userLocation     : {lat, lng}   │  ← Expo Location
│ locationError    : boolean      │
│ nearbyVendors    : VendorInfo[] │  ← Socket polling (15s)
│ selectedVendor   : VendorInfo   │  ← Tap marker / search result
│ refreshing       : boolean      │
│ searchVisible    : boolean      │
│ searchResults    : VendorInfo[] │  ← REST search response
│ pendingRequest   : string       │  ← vendorId being requested
│ vendorPin        : {lat, lng}   │  ← Accepted vendor location
└─────────────────────────────────┘
```

### 10.2 Vendor App State (HomeScreen)

```
┌─────────────────────────────────┐
│          HomeScreen State       │
├─────────────────────────────────┤
│ aujarActive      : boolean      │  ← Bluetooth/GPS connected
│ location         : {lat, lng}   │  ← Current GPS position
│ isTracking       : boolean      │  ← Broadcasting on/off
│ stock            : StockItem[]  │  ← Inventory list
│ inventoryLoaded  : boolean      │  ← Initial fetch done
│ itemName         : string       │  ← New item input
│ itemQty          : string       │  ← New item quantity input
│ incomingRequest  : Request      │  ← Active buyer request
│ acceptedBuyerPin : {lat, lng}   │  ← Accepted buyer location
└─────────────────────────────────┘
```

---

## 11. Technology Stack

### 11.1 Server

| Layer | Technology | Version/Details |
|-------|-----------|-----------------|
| Runtime | Node.js | — |
| Framework | Express | REST API |
| Real-time | Socket.io | WebSocket + fallback |
| Database | MongoDB | via Mongoose ODM |
| Auth | JWT + bcrypt | 7-day tokens, 10 salt rounds |
| Config | dotenv | Environment variables |

### 11.2 Mobile Apps

| Layer | Technology | Details |
|-------|-----------|---------|
| Framework | React Native (Expo v54) | Both apps |
| Language | TypeScript | Strict mode |
| Navigation | React Navigation (Stack) | Login → Home |
| Maps | Leaflet.js (via WebView) | Dark-themed tile layer |
| Location | expo-location | Foreground GPS |
| Networking | fetch + socket.io-client | REST + real-time |
| Bluetooth | react-native-ble-plx | Vendor app (GPS hardware) |

### 11.3 UI Theme

Both apps share a consistent dark theme:

| Color | Hex | Usage |
|-------|-----|-------|
| Primary BG | `#1a1a2e` | Main background |
| Secondary BG | `#16213e` | Cards, inputs |
| Tertiary BG | `#0f3460` | Accents, headers |
| Buyer Accent | `#0abde3` | Cyan — buyer markers, highlights |
| Vendor Accent | `#e94560` | Red — vendor markers, branding |
| Success | `#28a745` | Accepted status, green pins |
| Danger | `#dc3545` | Rejected status, errors |
| Text | `#ffffff` | Primary text |

---

## 12. Design Decisions & Trade-offs

### 12.1 WebView + Leaflet vs. Native Maps

**Decision:** Maps are rendered using Leaflet.js inside a WebView rather than `react-native-maps`.

**Rationale:**
- Consistent dark theme with custom tile layers (CartoDB Dark)
- Rich marker customization with CSS-based blip animations
- No dependency on Google Maps API keys
- Cross-platform consistency

**Trade-off:** Communication between React Native and the map requires `postMessage` / `onMessage` bridge, which adds complexity and slight latency.

### 12.2 In-Memory Session Tracking

**Decision:** `activeSessions` and `pendingRequests` are stored in server memory (JavaScript `Map`).

**Rationale:**
- Simple implementation, no Redis dependency
- Fast lookups for routing socket events
- Sufficient for current scale

**Trade-off:** State is lost on server restart. Pending requests are not persisted. Not horizontally scalable without adding Redis/shared state.

### 12.3 Polling for Nearby Vendors

**Decision:** Buyer app polls `get_nearby_vendors` every 15 seconds instead of server-push.

**Rationale:**
- Simpler to implement — buyer drives the refresh cadence
- Server doesn't need to maintain per-buyer subscription state
- Natural backpressure if buyer goes idle

**Trade-off:** Up to 15-second delay in seeing new vendors. Could be replaced with server-push when a vendor starts broadcasting in a buyer's radius.

### 12.4 AUJAR Bluetooth Abstraction

**Decision:** GPS is wrapped in a `useAujarBluetooth` hook that simulates a Bluetooth hardware device.

**Rationale:**
- Designed to integrate with actual Bluetooth GPS hardware (AUJAR device) in the future
- Currently wraps `expo-location` as a development stand-in
- Clean abstraction: callers don't know the GPS source

**Trade-off:** Extra indirection when no physical device is present.

### 12.5 JWT in Socket Handshake

**Decision:** Socket connections are authenticated via JWT passed in `handshake.auth.token`.

**Rationale:**
- Stateless authentication consistent with REST API
- No separate session management for sockets
- Role-based event routing from a single token

**Trade-off:** Token refresh requires reconnection. 7-day expiry is a balance between convenience and security.

### 12.6 No External State Management

**Decision:** Both apps use React's built-in `useState`/`useEffect` without Redux, Zustand, or MobX.

**Rationale:**
- Small app scope — state is concentrated in HomeScreen
- Fewer dependencies
- Simpler mental model for the current feature set

**Trade-off:** As features grow, prop drilling and state complexity may warrant a dedicated state library.

---

*Last updated: March 2026*
