# Thelawala Bridge Server

Real-time middleware backend connecting street vendors (Thelawalas) with local buyers.

## Prerequisites
- Node.js 18+
- MongoDB running locally (or set `MONGO_URI` in `.env`)

## Setup
```bash
npm install
cp .env .env.local   # Edit secrets for production
npm run dev           # Development with hot-reload
npm start             # Production
```

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/vendor/login` | Vendor login |
| POST | `/api/auth/vendor/register` | Vendor registration |
| POST | `/api/auth/client/login` | Client login |
| POST | `/api/auth/client/register` | Client registration |
| POST | `/api/vendor/inventory` | Update vendor inventory (auth required) |
| GET | `/api/search/vendor/:id` | Search vendor by thelaId |
| GET | `/api/search/item/:itemName` | Search vendors by item name |

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `vendor_location_update` | Vendor → Server | Stream live GPS `{ lat, lng }` |
| `vendor_stop_broadcast` | Vendor → Server | Stop broadcasting |
| `get_nearby_vendors` | Client → Server | Get vendors within radius |
| `send_item_request` | Client → Server | Request item from vendor |
| `incoming_request` | Server → Vendor | Buyer request routed to vendor |
| `request_decision` | Vendor → Server → Client | Accept/reject decision |
