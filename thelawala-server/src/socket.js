const { Server } = require('socket.io');
const { verifyToken } = require('./middleware/auth');
const Vendor = require('./models/Vendor');

// In-memory session map: userId → socketId
const activeSessions = new Map();
// Pending requests queue for offline vendors (vendorId string → array of requests)
const pendingRequests = new Map();
// Pending responses queue for offline clients (clientId string → array of responses)
const pendingResponses = new Map();
// Grace-period timers for vendor disconnects (userId → timeout handle)
const disconnectTimers = new Map();
const VENDOR_GRACE_PERIOD_MS = 300000; // 5 minutes — long enough for single-emulator testing

let io;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  // Authenticate socket connections via JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.user = verifyToken(token);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, role } = socket.user;
    activeSessions.set(userId, socket.id);

    console.log(`[WS] ${role} connected: ${userId} (socket ${socket.id})`);

    // Cancel any pending grace-period disconnect timer for this vendor
    if (role === 'vendor' && disconnectTimers.has(userId)) {
      clearTimeout(disconnectTimers.get(userId));
      disconnectTimers.delete(userId);
      console.log(`[WS] vendor ${userId} reconnected within grace period, staying online`);
    }

    // Deliver any pending responses queued while the client was offline
    if (role === 'client' && pendingResponses.has(userId)) {
      const queued = pendingResponses.get(userId);
      pendingResponses.delete(userId);
      console.log(`[WS] Delivering ${queued.length} pending response(s) to client ${userId}`);
      for (const resp of queued) {
        socket.emit('request_decision', resp);
      }
    }

    // Deliver any pending requests queued while the vendor was offline
    if (role === 'vendor' && pendingRequests.has(userId)) {
      const queued = pendingRequests.get(userId);
      pendingRequests.delete(userId);
      console.log(`[WS] Delivering ${queued.length} pending request(s) to vendor ${userId}`);
      for (const req of queued) {
        socket.emit('incoming_request', req);
      }
    }

    // ──────── Vendor events ────────

    // Vendor streams live GPS
    socket.on('vendor_location_update', async (data) => {
      if (role !== 'vendor') return;
      const { lat, lng } = data;
      if (typeof lat !== 'number' || typeof lng !== 'number') return;

      await Vendor.findByIdAndUpdate(userId, {
        lastLocation: { lat, lng },
        isBroadcasting: true,
      });
    });

    // Vendor stops broadcasting
    socket.on('vendor_stop_broadcast', async () => {
      if (role !== 'vendor') return;
      await Vendor.findByIdAndUpdate(userId, { isBroadcasting: false });
      console.log(`[WS] vendor explicitly stopped broadcasting: ${userId}`);
    });

    // Vendor decides on buyer request
    socket.on('request_decision', (data) => {
      if (role !== 'vendor') return;
      const { clientId, decision, vendorLocation } = data;

      const payload = { vendorId: userId, decision };
      if (decision === 'accepted' && vendorLocation) {
        payload.vendorLocation = vendorLocation;
      }

      const clientSocketId = activeSessions.get(clientId);
      if (clientSocketId) {
        console.log(`[WS] Routing decision "${decision}" to client ${clientId} (socket ${clientSocketId})`);
        io.to(clientSocketId).emit('request_decision', payload);
      } else {
        // Client is offline (e.g. backgrounded on single emulator) — queue for delivery
        console.log(`[WS] Client ${clientId} offline, queuing "${decision}" response`);
        if (!pendingResponses.has(clientId)) {
          pendingResponses.set(clientId, []);
        }
        pendingResponses.get(clientId).push(payload);
      }
    });

    // ──────── Client events ────────

    // Client asks for nearby vendors
    socket.on('get_nearby_vendors', async (data, callback) => {
      if (role !== 'client') return;
      const { lat, lng, radiusKm = 5 } = data;
      if (typeof lat !== 'number' || typeof lng !== 'number') return;

      const vendors = await Vendor.find({ isBroadcasting: true }).select('-passwordHash');
      console.log(`[WS] get_nearby_vendors: ${vendors.length} broadcasting vendor(s) in DB`);

      const nearby = vendors
        .filter(v => haversineKm(lat, lng, v.lastLocation.lat, v.lastLocation.lng) <= radiusKm)
        .map(v => ({
          thelaId: v.thelaId,
          vendorId: String(v._id),
          location: v.lastLocation,
          inventory: v.currentInventory,
        }));

      console.log(`[WS] get_nearby_vendors: ${nearby.length} vendor(s) within ${radiusKm}km of (${lat}, ${lng})`);
      if (typeof callback === 'function') callback(nearby);
    });

    // Client sends an item request to a specific vendor
    socket.on('send_item_request', (data) => {
      if (role !== 'client') return;
      const { vendorId, itemName, clientLocation } = data;
      // Normalize vendorId to string for Map lookup (MongoDB ObjectId → string)
      const vendorIdStr = String(vendorId);
      const vendorSocketId = activeSessions.get(vendorIdStr);

      const requestPayload = {
        clientId: userId,
        itemName,
        clientLocation,
      };

      if (vendorSocketId) {
        // Vendor is online — deliver immediately
        console.log(`[WS] Routing request from ${userId} to vendor ${vendorIdStr} (socket ${vendorSocketId})`);
        io.to(vendorSocketId).emit('incoming_request', requestPayload);
      } else {
        // Vendor is offline/backgrounded — queue for delivery on reconnect
        console.log(`[WS] Vendor ${vendorIdStr} offline, queuing request from ${userId}`);
        if (!pendingRequests.has(vendorIdStr)) {
          pendingRequests.set(vendorIdStr, []);
        }
        pendingRequests.get(vendorIdStr).push(requestPayload);
      }
    });

    // ──────── Disconnect ────────

    socket.on('disconnect', async () => {
      activeSessions.delete(userId);
      if (role === 'vendor') {
        // Grace period: wait before marking offline so brief disconnects
        // (app backgrounded, signal drop) don't kill the broadcast.
        console.log(`[WS] vendor disconnected, starting ${VENDOR_GRACE_PERIOD_MS / 1000}s grace period: ${userId}`);
        const timer = setTimeout(async () => {
          disconnectTimers.delete(userId);
          // Only mark offline if the vendor hasn't reconnected
          if (!activeSessions.has(userId)) {
            await Vendor.findByIdAndUpdate(userId, { isBroadcasting: false });
            console.log(`[WS] vendor grace period expired, set offline: ${userId}`);
          }
        }, VENDOR_GRACE_PERIOD_MS);
        disconnectTimers.set(userId, timer);
      }
      console.log(`[WS] ${role} disconnected: ${userId}`);
    });
  });
}

// Haversine formula — distance between two GPS points in km
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO };
