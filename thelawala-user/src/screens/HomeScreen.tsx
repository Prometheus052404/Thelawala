import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';

import {
  connectSocket,
  disconnectSocket,
  getSocket,
  searchVendorById,
  searchVendorsByItem,
} from '../services/api';
import SearchPanel from '../components/SearchPanel';
import VendorSheet from '../components/VendorSheet';
import type { VendorInfo } from '../types';

export default function HomeScreen({ route }: any) {
  const { token, clientId } = route.params;

  // Location
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState(false);

  // Vendors
  const [nearbyVendors, setNearbyVendors] = useState<VendorInfo[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<VendorInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Search
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchResults, setSearchResults] = useState<VendorInfo[] | null>(null);

  // Request status
  const [pendingRequest, setPendingRequest] = useState<string | null>(null); // vendorId being requested
  const [vendorPin, setVendorPin] = useState<{ lat: number; lng: number } | null>(null);

  const webviewRef = useRef<WebView>(null);

  // ──────── 1. Get user location ────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError(true);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, []);

  // Keep watching location
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 20 },
        (loc) => setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude }),
      );
    })();
    return () => { sub?.remove(); };
  }, []);

  // ──────── 2. Socket connection ────────
  useEffect(() => {
    const socket = connectSocket(token);

    socket.on('connect', () => console.log('[SOCKET] Buyer connected'));

    // Receive vendor accept/reject
    socket.on('request_decision', (data: any) => {
      setPendingRequest(null);
      if (data.decision === 'accepted') {
        if (data.vendorLocation) {
          setVendorPin(data.vendorLocation);
          updateMapVendorPin(data.vendorLocation.lat, data.vendorLocation.lng);
        }
        Alert.alert('Request Accepted! ✅', 'The vendor is on their way to you!');
      } else {
        Alert.alert('Request Declined ❌', 'The vendor cannot fulfill your request right now.');
      }
    });

    return () => { disconnectSocket(); };
  }, [token]);

  // ──────── 3. Fetch nearby vendors ────────
  const fetchNearby = useCallback(() => {
    if (!userLocation) return;
    const socket = getSocket();
    if (!socket?.connected) return;
    setRefreshing(true);

    socket.emit(
      'get_nearby_vendors',
      { lat: userLocation.lat, lng: userLocation.lng, radiusKm: 5 },
      (vendors: VendorInfo[]) => {
        setNearbyVendors(vendors || []);
        setRefreshing(false);
        updateMapVendors(vendors || []);
      },
    );
  }, [userLocation]);

  // Auto-fetch when location available
  useEffect(() => {
    if (userLocation) fetchNearby();
  }, [userLocation, fetchNearby]);

  // Poll every 15s for live updates
  useEffect(() => {
    if (!userLocation) return;
    const interval = setInterval(fetchNearby, 15000);
    return () => clearInterval(interval);
  }, [userLocation, fetchNearby]);

  // ──────── 4. Search ────────
  const handleSearch = async (query: string, type: 'vendor' | 'item') => {
    try {
      if (type === 'vendor') {
        const data = await searchVendorById(query);
        if (data.status === 'offline') {
          Alert.alert('Vendor Offline', data.message);
          setSearchResults([]);
          return;
        }
        setSearchResults([
          {
            thelaId: data.thelaId,
            vendorId: data.thelaId,
            location: data.location,
            inventory: data.inventory || [],
          },
        ]);
      } else {
        const data = await searchVendorsByItem(query);
        setSearchResults(
          (data.results || []).map((v: any) => ({
            thelaId: v.thelaId,
            vendorId: v.thelaId,
            location: v.location,
            inventory: v.inventory || [],
          })),
        );
      }
    } catch (err: any) {
      if (err.status === 404) {
        Alert.alert('Not Found', 'No vendor found with that ID.');
        setSearchResults([]);
      } else {
        Alert.alert('Error', 'Search failed. Please try again.');
      }
    }
  };

  // ──────── 5. Request item from vendor ────────
  const handleRequestItem = (vendor: VendorInfo, itemName: string) => {
    if (!userLocation) {
      Alert.alert('Location Required', 'Please enable location to send requests.');
      return;
    }
    const socket = getSocket();
    if (!socket?.connected) {
      Alert.alert('Offline', 'Not connected to server.');
      return;
    }
    socket.emit('send_item_request', {
      vendorId: vendor.vendorId,
      itemName,
      clientLocation: userLocation,
    });
    setPendingRequest(vendor.vendorId);
    setSelectedVendor(null);
    Alert.alert('Request Sent! 📤', `Waiting for ${vendor.thelaId} to respond...`);
  };

  // ──────── 6. Map injection helpers ────────
  const updateMapVendors = (vendors: VendorInfo[]) => {
    if (!webviewRef.current) return;
    const json = JSON.stringify(
      vendors.map((v) => ({
        id: v.thelaId,
        lat: v.location.lat,
        lng: v.location.lng,
        items: v.inventory.length,
      })),
    );
    webviewRef.current.injectJavaScript(`window.setVendors && window.setVendors(${json}); true;`);
  };

  const updateMapVendorPin = (lat: number, lng: number) => {
    if (!webviewRef.current) return;
    webviewRef.current.injectJavaScript(
      `window.showVendorPin && window.showVendorPin(${lat}, ${lng}); true;`,
    );
  };

  // Handle taps on vendor markers inside the WebView
  const handleWebViewMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'vendor_tap') {
        const vendor = nearbyVendors.find((v) => v.thelaId === msg.id);
        if (vendor) setSelectedVendor(vendor);
      }
    } catch {}
  };

  // ──────── 7. Map HTML ────────
  const startLat = userLocation?.lat ?? 12.8781;
  const startLng = userLocation?.lng ?? 80.1416;

  const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0}
    body{background:#0f0f23}
    #map{height:100vh;width:100vw}
    .user-blip{background:#0abde3;width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 12px rgba(10,189,227,0.7)}
    .vendor-blip{background:#e94560;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 10px rgba(233,69,96,0.6)}
    .vendor-pin{background:#28a745;width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 14px rgba(40,167,69,0.8)}
    .leaflet-popup-content-wrapper{background:#16213e;color:#ddd;border-radius:10px}
    .leaflet-popup-tip{background:#16213e}
    .leaflet-popup-content{font:13px sans-serif}
  </style>
</head>
<body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false}).setView([${startLat},${startLng}],15);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{maxZoom:19}).addTo(map);

var userIcon=L.divIcon({className:'x',html:"<div class='user-blip'></div>",iconSize:[22,22],iconAnchor:[11,11]});
var vendorIcon=L.divIcon({className:'x',html:"<div class='vendor-blip'></div>",iconSize:[18,18],iconAnchor:[9,9]});
var pinIcon=L.divIcon({className:'x',html:"<div class='vendor-pin'></div>",iconSize:[22,22],iconAnchor:[11,11]});

var userMarker=L.marker([${startLat},${startLng}],{icon:userIcon}).addTo(map).bindPopup('You are here');
var vendorMarkers=[];
var pinMarker=null;

window.setUserLocation=function(lat,lng){
  userMarker.setLatLng([lat,lng]);
  map.panTo([lat,lng]);
};

window.setVendors=function(vendors){
  vendorMarkers.forEach(function(m){map.removeLayer(m)});
  vendorMarkers=[];
  vendors.forEach(function(v){
    var m=L.marker([v.lat,v.lng],{icon:vendorIcon}).addTo(map);
    m.bindPopup('<b>'+v.id+'</b><br/>'+v.items+' items');
    m.on('click',function(){
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'vendor_tap',id:v.id}));
    });
    vendorMarkers.push(m);
  });
};

window.showVendorPin=function(lat,lng){
  if(pinMarker)map.removeLayer(pinMarker);
  pinMarker=L.marker([lat,lng],{icon:pinIcon}).addTo(map).bindPopup('Vendor coming here!').openPopup();
};
</script>
</body>
</html>`;

  // Update user position on map when location changes
  useEffect(() => {
    if (userLocation && webviewRef.current) {
      webviewRef.current.injectJavaScript(
        `window.setUserLocation && window.setUserLocation(${userLocation.lat}, ${userLocation.lng}); true;`,
      );
    }
  }, [userLocation]);

  // ──────── RENDER ────────
  if (locationError) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        <Text style={styles.errorIcon}>📍</Text>
        <Text style={styles.errorText}>Location permission is required to find nearby vendors.</Text>
      </View>
    );
  }

  if (!userLocation) {
    return (
      <View style={[styles.container, styles.center]}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        <ActivityIndicator size="large" color="#0abde3" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topTitle}>Thelawala</Text>
          <Text style={styles.topSub}>{nearbyVendors.length} vendors nearby</Text>
        </View>
        <View style={styles.topActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={fetchNearby}>
            <Text style={styles.iconBtnText}>{refreshing ? '⏳' : '🔄'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setSearchVisible(!searchVisible)}
          >
            <Text style={styles.iconBtnText}>🔍</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Pending request banner */}
      {pendingRequest && (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingText}>⏳ Waiting for vendor response...</Text>
        </View>
      )}

      {/* Vendor pin accepted banner */}
      {vendorPin && (
        <View style={styles.acceptedBanner}>
          <Text style={styles.acceptedText}>✅ A vendor is heading your way!</Text>
          <TouchableOpacity onPress={() => setVendorPin(null)}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search panel (slides down) */}
      {searchVisible && (
        <SearchPanel
          onSearch={handleSearch}
          results={searchResults}
          onSelectVendor={(v) => {
            setSelectedVendor(v);
            setSearchVisible(false);
            setSearchResults(null);
          }}
          onClose={() => {
            setSearchVisible(false);
            setSearchResults(null);
          }}
        />
      )}

      {/* MAP */}
      <View style={styles.mapWrap}>
        <WebView
          ref={webviewRef}
          source={{ html: mapHtml, baseUrl: 'https://openstreetmap.org' }}
          originWhitelist={['*']}
          javaScriptEnabled
          onMessage={handleWebViewMessage}
          userAgent="ThelawalaUserApp/1.0"
          style={{ flex: 1 }}
          scrollEnabled={false}
        />
      </View>

      {/* Bottom vendor list bar */}
      {!selectedVendor && nearbyVendors.length > 0 && !searchVisible && (
        <View style={styles.bottomBar}>
          <Text style={styles.bottomTitle}>Nearby Vendors</Text>
          {nearbyVendors.slice(0, 4).map((v) => (
            <TouchableOpacity
              key={v.thelaId}
              style={styles.vendorChip}
              onPress={() => setSelectedVendor(v)}
            >
              <Text style={styles.chipIcon}>🛒</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.chipName}>{v.thelaId}</Text>
                <Text style={styles.chipItems}>{v.inventory.length} items</Text>
              </View>
              <Text style={styles.chipArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Vendor detail sheet */}
      {selectedVendor && (
        <VendorSheet
          vendor={selectedVendor}
          onRequestItem={handleRequestItem}
          onClose={() => setSelectedVendor(null)}
          isPending={pendingRequest === selectedVendor.vendorId}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  center: { justifyContent: 'center', alignItems: 'center', padding: 32 },

  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorText: { color: '#aaa', fontSize: 16, textAlign: 'center', lineHeight: 24 },
  loadingText: { color: '#aaa', marginTop: 16, fontSize: 14 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: 10,
    backgroundColor: '#1a1a2e',
  },
  topTitle: { color: '#0abde3', fontWeight: '800', fontSize: 22 },
  topSub: { color: '#777', fontSize: 12, marginTop: 2 },
  topActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    backgroundColor: '#16213e',
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnText: { fontSize: 18 },

  // Banners
  pendingBanner: {
    backgroundColor: '#f39c12',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  pendingText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  acceptedBanner: {
    backgroundColor: '#28a745',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  acceptedText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  dismissText: { color: '#fff', fontWeight: 'bold', textDecorationLine: 'underline', fontSize: 13 },

  // Map
  mapWrap: { flex: 1 },

  // Bottom bar
  bottomBar: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'android' ? 10 : 28,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: 260,
  },
  bottomTitle: {
    color: '#0abde3',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  vendorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#1a4a7a',
  },
  chipIcon: { fontSize: 20, marginRight: 10 },
  chipName: { color: '#ddd', fontWeight: '600', fontSize: 14 },
  chipItems: { color: '#777', fontSize: 11, marginTop: 2 },
  chipArrow: { color: '#0abde3', fontSize: 22, fontWeight: 'bold' },
});
