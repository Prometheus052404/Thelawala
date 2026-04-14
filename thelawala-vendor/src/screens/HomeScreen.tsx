import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';

import { useAujarBluetooth } from '../hooks/useAujarBluetooth';
import MapSection from '../components/MapSection';
import InventorySection, { StockItem } from '../components/InventorySection';
import { connectSocket, disconnectSocket, getSocket, updateInventory, fetchInventory } from '../services/api';

export default function HomeScreen({ route }: any) {
  const { thelaId, token } = route.params;

  // --- 1. HARDWARE MODULE (Bluetooth / GPS) ---
  const { aujarActive, location, connectToAujar } = useAujarBluetooth();
  const [isTracking, setIsTracking] = useState(false);

  // --- 2. INVENTORY STATE ---
  const [stock, setStock] = useState<StockItem[]>([]);
  const [inventoryLoaded, setInventoryLoaded] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('');

  // --- 3. INCOMING REQUEST STATE ---
  const [incomingRequest, setIncomingRequest] = useState<any>(null);
  const [acceptedBuyerPin, setAcceptedBuyerPin] = useState<{ lat: number; lng: number } | null>(null);

  // Calculate distance between two coordinates in meters
  const getDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const getBuyerDistance = () => {
    if (!incomingRequest?.clientLocation || !location) return null;
    const d = getDistanceMeters(
      location.lat, location.lng,
      incomingRequest.clientLocation.lat, incomingRequest.clientLocation.lng,
    );
    return d < 1000 ? `${Math.round(d)}m` : `${(d / 1000).toFixed(1)}km`;
  };

  // --- LOAD SAVED INVENTORY FROM SERVER ---
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchInventory(token);
        if (data.inventory && data.inventory.length > 0) {
          setStock(data.inventory);
        }
      } catch {
        // First-time vendor or network issue — start with empty stock
      } finally {
        setInventoryLoaded(true);
      }
    })();
  }, [token]);

  // Inventory Logic
  const addItem = () => {
    if (itemName.trim() === '' || itemQty.trim() === '') return;
    const newItem = { id: Date.now().toString(), name: itemName, quantity: parseInt(itemQty) || 1 };
    setStock(prev => [...prev, newItem]);
    setItemName('');
    setItemQty('');
  };

  const updateQuantity = (id: string, amount: number) => {
    setStock(prev =>
      prev.map(item =>
        item.id === id ? { ...item, quantity: Math.max(0, item.quantity + amount) } : item,
      ),
    );
  };

  const deleteItem = (id: string) => {
    setStock(prev => prev.filter(item => item.id !== id));
  };

  // --- 4. SOCKET CONNECTION ---
  useEffect(() => {
    // Force a fresh connection each time HomeScreen mounts
    disconnectSocket();
    const socket = connectSocket(token);

    socket.on('connect', () => {
      console.log('[SOCKET] Connected to server');
    });

    // Listen for buyer requests
    socket.on('incoming_request', (data: any) => {
      console.log('[SOCKET] Incoming request:', data);
      setIncomingRequest(data);
      Alert.alert(
        '📦 New Request!',
        `A buyer wants: ${data.itemName}`,
        [{ text: 'OK' }],
      );
    });

    socket.on('connect_error', (err: any) => {
      console.warn('[SOCKET] Connection error:', err.message);
    });

    socket.on('reconnect', () => {
      console.log('[SOCKET] Reconnected to server');
    });

    return () => {
      // Tell server we're going offline before disconnecting
      const s = getSocket();
      if (s?.connected) {
        s.emit('vendor_stop_broadcast');
      }
      disconnectSocket();
    };
  }, [token]);

  // --- 5. SYNC INVENTORY TO SERVER ---
  const syncInventory = useCallback(async () => {
    try {
      await updateInventory(token, stock);
    } catch {
      // Silent fail for now; next sync will retry
    }
  }, [token, stock]);

  useEffect(() => {
    if (inventoryLoaded) syncInventory();
  }, [stock, syncInventory, inventoryLoaded]);

  // --- 6. BROADCAST LOCATION ---
  useEffect(() => {
    if (isTracking && aujarActive && location) {
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('vendor_location_update', { lat: location.lat, lng: location.lng });
      }
    }
  }, [location, isTracking, aujarActive]);

  // Toggle broadcast
  const toggleBroadcast = () => {
    const next = !isTracking;
    setIsTracking(next);
    if (!next) {
      getSocket()?.emit('vendor_stop_broadcast');
    }
  };

  // --- 7. HANDLE BUYER REQUEST ---
  const handleDecision = (decision: 'accepted' | 'rejected') => {
    if (!incomingRequest) return;
    getSocket()?.emit('request_decision', {
      clientId: incomingRequest.clientId,
      decision,
      vendorLocation: location,
    });
    if (decision === 'accepted' && incomingRequest.clientLocation) {
      setAcceptedBuyerPin({
        lat: incomingRequest.clientLocation.lat,
        lng: incomingRequest.clientLocation.lng,
      });
      Alert.alert('Accepted ✅', 'Buyer location pinned on your map. Head there to deliver!');
    } else if (decision === 'rejected') {
      Alert.alert('Rejected', 'Request has been declined.');
    }
    setIncomingRequest(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{thelaId}</Text>
          <Text style={styles.headerSub}>
            {isTracking ? '🟢 Broadcasting Live' : '🔴 Offline'}
          </Text>
        </View>
        <View style={[styles.statusDot, isTracking ? styles.dotGreen : styles.dotRed]} />
      </View>

      {/* INCOMING REQUEST BANNER */}
      {incomingRequest && (
        <View style={styles.requestBanner}>
          <Text style={styles.requestText}>
            📦 Buyer wants: <Text style={styles.requestItem}>{incomingRequest.itemName}</Text>
          </Text>
          {incomingRequest.clientLocation && (
            <Text style={styles.requestLocation}>
              📍 Buyer is {getBuyerDistance() || '...'} away
              ({incomingRequest.clientLocation.lat.toFixed(4)}, {incomingRequest.clientLocation.lng.toFixed(4)})
            </Text>
          )}
          <View style={styles.requestActions}>
            <TouchableOpacity
              style={[styles.decisionBtn, styles.acceptBtn]}
              onPress={() => handleDecision('accepted')}
            >
              <Text style={styles.decisionText}>✓ Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.decisionBtn, styles.rejectBtn]}
              onPress={() => handleDecision('rejected')}
            >
              <Text style={styles.decisionText}>✗ Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ACCEPTED DELIVERY PIN BANNER */}
      {acceptedBuyerPin && !incomingRequest && (
        <View style={styles.deliveryBanner}>
          <Text style={styles.deliveryText}>
            🟢 Delivery pinned: ({acceptedBuyerPin.lat.toFixed(4)}, {acceptedBuyerPin.lng.toFixed(4)})
          </Text>
          <TouchableOpacity onPress={() => setAcceptedBuyerPin(null)}>
            <Text style={styles.deliveryDismiss}>Done ✓</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* INVENTORY */}
      <InventorySection
        stock={stock}
        itemName={itemName}
        setItemName={setItemName}
        itemQty={itemQty}
        setItemQty={setItemQty}
        onAddItem={addItem}
        onUpdateQuantity={updateQuantity}
        onDeleteItem={deleteItem}
      />

      {/* MAP */}
      <MapSection
        aujarActive={aujarActive}
        location={location}
        connectToAujar={connectToAujar}
        buyerPin={
          incomingRequest?.clientLocation
            ? { lat: incomingRequest.clientLocation.lat, lng: incomingRequest.clientLocation.lng, label: 'Buyer location', accepted: false }
            : acceptedBuyerPin
              ? { lat: acceptedBuyerPin.lat, lng: acceptedBuyerPin.lng, label: 'Deliver here', accepted: true }
              : null
        }
      />

      {/* BROADCAST TOGGLE */}
      {aujarActive && (
        <TouchableOpacity
          style={[styles.trackButton, isTracking ? styles.trackOn : styles.trackOff]}
          onPress={toggleBroadcast}
        >
          <Text style={styles.trackButtonText}>
            {isTracking ? '⏸  STOP BROADCASTING' : '▶  START BROADCASTING'}
          </Text>
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: 12,
    backgroundColor: '#1a1a2e',
  },
  headerTitle: { color: '#e94560', fontWeight: '800', fontSize: 20 },
  headerSub: { color: '#aaa', fontSize: 12, marginTop: 2 },
  statusDot: { width: 14, height: 14, borderRadius: 7 },
  dotGreen: { backgroundColor: '#28a745' },
  dotRed: { backgroundColor: '#dc3545' },

  // Incoming request
  requestBanner: {
    backgroundColor: '#e94560',
    margin: 12,
    borderRadius: 12,
    padding: 14,
  },
  requestText: { color: '#fff', fontSize: 15, marginBottom: 4 },
  requestItem: { fontWeight: 'bold', fontSize: 16 },
  requestLocation: { color: '#ffd6de', fontSize: 13, marginBottom: 10 },
  requestActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  decisionBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  acceptBtn: { backgroundColor: '#28a745' },
  rejectBtn: { backgroundColor: '#333' },
  decisionText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  // Broadcast toggle
  trackButton: { padding: 18, alignItems: 'center' },
  trackOff: { backgroundColor: '#dc3545' },
  trackOn: { backgroundColor: '#28a745' },
  trackButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15, letterSpacing: 1 },

  // Delivery pin banner
  deliveryBanner: {
    backgroundColor: '#16213e',
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
    margin: 12,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deliveryText: { color: '#aaa', fontSize: 13, flex: 1 },
  deliveryDismiss: { color: '#28a745', fontWeight: 'bold', fontSize: 14, marginLeft: 12 },
});