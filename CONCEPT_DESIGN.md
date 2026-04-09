# Thelawala — Concept Design Document

> **From research insight to solution architecture: how structured analysis shaped the Thelawala platform.**

---

## 1. Research-Driven Focus Areas

### 1.1 Inferences from SNAC Analysis

The Situation-Needs-Actions-Consequences (SNAC) analysis of the street-vending ecosystem surfaced several critical pain points:

- **Unpredictable availability** — Buyers have no way of knowing when or where a specific thelawala will appear. Purchase opportunities are entirely left to chance.
- **Zero communication channel** — No structured means exists for a buyer to signal intent or request a product from a thelawala before the vendor passes by.
- **Vendor invisibility** — Thelawalas operate without any digital presence; their routes and inventory are opaque to potential customers.
- **Missed revenue** — Vendors lose sales simply because nearby interested buyers are unaware of their presence.

### 1.2 Inferences from the Discovery Matrix

The Discovery Matrix mapped unmet needs against existing alternatives and revealed:

- **No real-time tracking solution** exists for informal street vendors — general-purpose delivery or ride-hailing models do not apply.
- **Product-level search** is absent — buyers cannot search "who is selling panipuri near me right now."
- **Bidirectional communication** between vendor and buyer is a gap entirely unaddressed by any current tool or behaviour pattern.

### 1.3 Inferences from ISM (Interpretive Structural Modelling)

ISM analysis established a hierarchy of driving and dependent factors:

- **Driving factors (high driving power, low dependence):** vendor location awareness, real-time communication infrastructure, and low-barrier hardware access.
- **Dependent factors (high dependence, low driving power):** purchase conversion, customer satisfaction, vendor income growth.
- **Key insight:** Solving the *location awareness* and *communication* layers at the base of the hierarchy would cascade benefits upward to all dependent outcomes.

**Conclusion from all three frameworks:** The solution must focus on **(1) real-time vendor location tracking, (2) product discovery, and (3) a structured buyer-vendor communication channel** — these are the foundational drivers that unlock all higher-order value.

---

## 2. The Concept

The research converged on a single concept: **a platform that makes thelawalas visible, searchable, and reachable in real time.**

### 2.1 Core Capabilities

The concept is structured around four capabilities derived directly from the research focus areas:

| # | Capability | Addresses |
|---|-----------|-----------|
| 1 | **Track** — A user can follow specific thelawalas and see their live location on a map | Unpredictable availability |
| 2 | **Discover** — A user can see all thelawalas near their current location | Vendor invisibility |
| 3 | **Search** — A user can search for thelawalas selling a specific product | Product-level search gap |
| 4 | **Request** — A user can send a purchase request to a thelawala, relaying their location so the vendor can come to them | Zero communication channel |

### 2.2 Concept Flow

```
  BUYER                                                    THELAWALA
  ─────                                                    ─────────

  Opens app
    │
    ├── Sees nearby thelawalas on a live map  ◄────────────  Broadcasting location
    │
    ├── Searches for "panipuri"
    │     └── Gets list of thelawalas selling it nearby
    │
    ├── Taps a thelawala → views inventory
    │
    ├── Taps "Request" on an item
    │     └── Buyer's location is relayed  ──────────────►  Receives request alert
    │         to the thelawala                               with buyer's distance
    │                                                         │
    │                                                    Accepts / Rejects
    │                                                         │
    ├── Receives response  ◄──────────────────────────────────┘
    │     ├── Accepted → Sees vendor's pinned location on map
    │     └── Rejected → Notified
    │
    └── Walks to vendor / vendor comes closer
```

### 2.3 Proximity Notification via Automated Calling

Beyond in-app interactions, users may want to be notified when a *specific* thelawala enters their vicinity — even when the app is closed. The concept addresses this through **automated calling services**:

- A user subscribes to notifications for a particular thelawala (e.g., "notify me when the kulfi-wala is within 500m").
- When the server detects that the subscribed thelawala's live location falls within the user's radius, it triggers an **automated voice call** to the user's registered phone number.
- This approach is chosen over push notifications because:
  - A phone call is impossible to miss — it rings even in silent/DND for whitelisted contacts.
  - It does not require the app to be open or running in the background.
  - It works on any phone, including feature phones without smartphone capabilities.

---

## 3. Addressing Hardware & Battery Constraints

### 3.1 The Problem

Two practical constraints threaten the viability of continuous location broadcasting:

1. **Battery drain on phones** — Continuous GPS tracking and network transmission drain a smartphone's battery rapidly, making it unsustainable for vendors who work 8–12 hour shifts.
2. **Phone accessibility** — Many thelawalas operate without a smartphone, or share a device with family members and cannot dedicate it to location broadcasting all day.

### 3.2 The Solution: AUJAR — A Dedicated Hardware Device

To mitigate both constraints, the concept introduces **AUJAR**, a purpose-built hardware device that offloads location broadcasting entirely from the phone:

```
┌──────────────────────────────────────────────────────────┐
│                     AUJAR DEVICE                         │
│                                                          │
│   ┌──────────┐    ┌──────────────┐    ┌──────────────┐   │
│   │   GPS    │───►│  Bluetooth   │───►│  Paired      │   │
│   │  Module  │    │  Transmitter │    │  Smartphone  │   │
│   └──────────┘    └──────────────┘    │  (relay to   │   │
│                                       │   server)    │   │
│   • Low-power, always-on             └──────────────┘   │
│   • Battery: lasts full work shift                       │
│   • Compact, mounts on thela                             │
│   • No screen, no interaction needed                     │
└──────────────────────────────────────────────────────────┘
```

**How AUJAR works:**

1. The AUJAR device contains a **GPS module** that continuously acquires the thelawala's position.
2. It transmits coordinates over **Bluetooth Low Energy (BLE)** to any paired smartphone nearby — this could be the vendor's own phone, a shared phone, or even a community relay phone.
3. The paired phone acts as a **bridge**, forwarding GPS data to the Thelawala server over the internet.
4. The server broadcasts this location to all connected buyer apps, just as if the vendor were using the mobile app directly.

**Why this works:**

| Constraint | How AUJAR solves it |
|-----------|-------------------|
| Battery drain | AUJAR uses its own low-power battery; the phone's GPS stays off |
| No smartphone | AUJAR can pair with *any* nearby phone — a family member's, a neighbouring vendor's, or a community device |
| Simplicity | No interaction required — the vendor just turns it on and goes about their day |
| Durability | No screen or complex electronics — built to survive outdoor conditions on a thela |

---

## 4. Solution Architecture

### 4.1 Architecture Overview

The solution is structured as a three-layer system with an optional hardware peripheral:

```
┌─────────────────────────────────────────────────────────────────────┐
│                       SOLUTION ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────┘

              HARDWARE LAYER                 APPLICATION LAYER
        ┌─────────────────────┐        ┌─────────────────────────┐
        │                     │        │    BUYER APP (Mobile)   │
        │   AUJAR Device      │        │                         │
        │   ┌─────┐  ┌─────┐ │  BLE   │  • Live map of vendors  │
        │   │ GPS │──│ BLE │─┼────┐   │  • Search by product    │
        │   └─────┘  └─────┘ │    │   │  • Search by thela ID   │
        │                     │    │   │  • Send item requests   │
        └─────────────────────┘    │   │  • Receive responses    │
                                   │   │  • Proximity alerts     │
                                   │   └────────────┬────────────┘
                                   │                │
        ┌─────────────────────┐    │                │  Socket.io
        │   VENDOR APP        │    │                │  + REST
        │   (Mobile)          │◄───┘                │
        │                     │                     │
        │  • Receive AUJAR    │                     │
        │    GPS via BLE      │                     │
        │  • Manage inventory │     ┌───────────────▼───────────┐
        │  • Respond to       │     │                           │
        │    requests         ├────►│     BRIDGE SERVER         │
        │  • Broadcast        │     │                           │
        │    location         │     │  • Auth (JWT)             │
        └─────────────────────┘     │  • Real-time relay        │
                                    │  • Proximity calculation  │
                                    │  • Inventory storage      │
                                    │  • Request routing        │
                                    │  • Automated call trigger │
                                    │                           │
                                    │  ┌─────────┐ ┌─────────┐ │
                                    │  │ MongoDB │ │ Calling  │ │
                                    │  │         │ │ Service  │ │
                                    │  └─────────┘ └─────────┘ │
                                    └───────────────────────────┘
```

### 4.2 Layer Responsibilities

| Layer | Components | Role |
|-------|-----------|------|
| **Hardware** | AUJAR device | Acquire GPS, transmit via BLE — eliminates phone dependency |
| **Vendor Application** | Mobile app | Receive AUJAR data, manage inventory, respond to buyer requests |
| **Buyer Application** | Mobile app | Discover vendors, search products, send requests, receive notifications |
| **Server** | Bridge server + MongoDB + calling service | Authenticate, relay location, route requests, trigger proximity calls |

---

## 5. Current Implementation

The following capabilities are **built and functional** in the current version of the platform:

### 5.1 Implemented Features

| Feature | Status | Details |
|---------|--------|---------|
| Vendor registration & login | ✅ Done | JWT-based auth with thelaId + password |
| Buyer registration & login | ✅ Done | JWT-based auth with phone number + password |
| Live vendor location broadcast | ✅ Done | GPS → Socket.io → server → buyer map |
| Nearby vendor discovery | ✅ Done | Haversine-filtered list within 5 km radius, polled every 15s |
| Search by product name | ✅ Done | REST endpoint, case-insensitive match on broadcasting vendors |
| Search by thela ID | ✅ Done | REST endpoint returning vendor status + location |
| Vendor inventory management | ✅ Done | Add / edit / delete items, auto-synced to server |
| Item purchase request | ✅ Done | Buyer sends request → vendor receives with distance → accepts/rejects |
| Location relay on accept | ✅ Done | Vendor's location pinned on buyer's map upon acceptance |
| AUJAR hardware abstraction | ✅ Done | `useAujarBluetooth` hook — currently backed by `expo-location`, ready for BLE hardware |
| Real-time map (Leaflet/WebView) | ✅ Done | Dark-themed map with animated vendor/buyer markers |
| Offline request queuing | ✅ Done | Server queues requests for temporarily disconnected vendors |

### 5.2 Current Architecture Stack

```
Buyer App ──┐                        ┌── MongoDB (Persistence)
            ├── Socket.io + REST ──► Bridge Server ──┤
Vendor App ─┘                        └── In-Memory Maps (Sessions, Queues)
```

---

## 6. Future Implementation

The following features represent the planned evolution of the platform:

### 6.1 Planned Features

| Feature | Priority | Description |
|---------|----------|-------------|
| **AUJAR physical device** | High | Manufacture and integrate the BLE GPS hardware device for production use |
| **Automated calling service** | High | Integrate telephony API (e.g., Twilio) to place voice calls when a subscribed vendor enters the buyer's vicinity |
| **Vendor subscription / follow** | High | Allow buyers to "follow" specific thelawalas and receive proximity-triggered notifications |
| **Persistent session state** | Medium | Migrate `activeSessions` and `pendingRequests` from in-memory Maps to Redis for crash resilience and horizontal scaling |
| **Push notifications** | Medium | Firebase Cloud Messaging for in-app alerts when the app is backgrounded |
| **Order history** | Medium | Persist completed requests for buyer/vendor reference |
| **Vendor analytics dashboard** | Low | Show vendors their request acceptance rate, peak demand areas, and popular items |
| **Multi-language support** | Low | Hindi, Marathi, and other regional language interfaces for vendor accessibility |
| **Payment integration** | Low | UPI / wallet-based prepayment for confirmed requests |
| **Community relay mode** | Low | Allow a single phone to relay AUJAR data from multiple nearby vendors simultaneously |

### 6.2 Future Architecture (Target State)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        FUTURE STATE ARCHITECTURE                         │
└──────────────────────────────────────────────────────────────────────────┘

  AUJAR Devices ──► BLE ──► Relay Phones ──┐
                                            │
  Vendor Apps ─────────────────────────────┤
                                            ├──► Bridge Server (Clustered)
  Buyer Apps ──────────────────────────────┤        │
                                            │        ├── MongoDB (Replica Set)
                                            │        ├── Redis (Sessions + Queues)
                                            │        ├── Twilio (Automated Calls)
                                            │        ├── Firebase (Push Notifications)
                                            │        └── Analytics Pipeline
                                            │
  Admin Dashboard ─────────────────────────┘
```

### 6.3 AUJAR Integration Roadmap

```
Phase 1 (Current)    Phase 2              Phase 3
─────────────────    ──────────────────   ──────────────────
Software hook        Prototype hardware   Production hardware
using expo-location  BLE GPS module       + community relay
as GPS source        paired with app      multi-vendor support
                     via BLE library      batch manufacturing
```

---

## 7. Summary

The Thelawala concept emerged from structured research (SNAC, Discovery Matrix, ISM) that identified **real-time location awareness, product discoverability, and buyer-vendor communication** as the foundational drivers of value in the street-vending ecosystem. Every dependent outcome — purchase conversion, vendor income, customer satisfaction — traces back to these three pillars.

The concept addresses these drivers through a platform that lets buyers **track, discover, search, and request** from thelawalas in real time. It extends beyond the app with **automated calling services** for proximity alerts, ensuring reachability even when the app is closed. The **AUJAR hardware device** removes the dependency on the vendor owning a smartphone and eliminates battery drain, making the system viable for real-world, all-day operation.

The current implementation delivers the core real-time loop — broadcast, discover, search, request, respond — while the architecture is designed to evolve toward dedicated hardware, telephony integration, and horizontal scalability.

---

*Last updated: March 2026*
