import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

type BuyerPin = { lat: number; lng: number; label?: string; accepted?: boolean } | null;

export default function MapSection({ aujarActive, location, connectToAujar, buyerPin }: any & { buyerPin?: BuyerPin }) {
  const webviewRef = useRef<WebView>(null);

  useEffect(() => {
    if (location && webviewRef.current) {
      const script = `
        if (window.updateMarker) {
          window.updateMarker(${location.lat}, ${location.lng});
        }
        true;
      `;
      webviewRef.current.injectJavaScript(script);
    }
  }, [location]);

  // Show/update/remove buyer pin on the map
  useEffect(() => {
    if (!webviewRef.current) return;
    if (buyerPin) {
      const color = buyerPin.accepted ? '#28a745' : '#0abde3';
      const label = buyerPin.label || (buyerPin.accepted ? 'Deliver here' : 'Buyer location');
      webviewRef.current.injectJavaScript(`
        window.showBuyerPin && window.showBuyerPin(${buyerPin.lat}, ${buyerPin.lng}, '${color}', '${label}');
        true;
      `);
    } else {
      webviewRef.current.injectJavaScript(`
        window.removeBuyerPin && window.removeBuyerPin();
        true;
      `);
    }
  }, [buyerPin]);

  const startLat = location ? location.lat : 12.8781;
  const startLng = location ? location.lng : 80.1416;

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { padding: 0; margin: 0; background-color: #0f0f23; }
        #map { height: 100vh; width: 100vw; }
        .gps-blip {
          background-color: #e94560;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 3px solid #fff;
          box-shadow: 0 0 12px rgba(233,69,96,0.7);
        }
        .buyer-blip {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 3px solid #fff;
        }
        .leaflet-popup-content-wrapper{background:#16213e;color:#ddd;border-radius:10px}
        .leaflet-popup-tip{background:#16213e}
        .leaflet-popup-content{font:13px sans-serif}
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${startLat}, ${startLng}], 16);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap &copy; CARTO'
        }).addTo(map);
        var customIcon = L.divIcon({
          className: 'custom-div-icon',
          html: "<div class='gps-blip'></div>",
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        var marker = L.marker([${startLat}, ${startLng}], {icon: customIcon}).addTo(map);
        var buyerMarker = null;

        window.updateMarker = function(lat, lng) {
          var ll = new L.LatLng(lat, lng);
          marker.setLatLng(ll);
          map.panTo(ll);
        };

        window.showBuyerPin = function(lat, lng, color, label) {
          if (buyerMarker) map.removeLayer(buyerMarker);
          var icon = L.divIcon({
            className: 'x',
            html: "<div class='buyer-blip' style='background:" + color + ";box-shadow:0 0 12px " + color + "'></div>",
            iconSize: [22, 22],
            iconAnchor: [11, 11]
          });
          buyerMarker = L.marker([lat, lng], { icon: icon }).addTo(map).bindPopup('<b>' + label + '</b>').openPopup();
          // Fit both markers in view
          var group = L.featureGroup([marker, buyerMarker]);
          map.fitBounds(group.getBounds().pad(0.3));
        };

        window.removeBuyerPin = function() {
          if (buyerMarker) { map.removeLayer(buyerMarker); buyerMarker = null; }
        };
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.mapContainer}>
      {!aujarActive || !location ? (
        <View style={styles.noHardwareView}>
          <Text style={styles.noHardwareTitle}>📡 GPS Module</Text>
          <Text style={styles.noHardwareText}>
            Connect your AUJAR device to begin location tracking
          </Text>
          <TouchableOpacity onPress={connectToAujar} style={styles.btn}>
            <Text style={styles.btnText}>CONNECT TO AUJAR</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          ref={webviewRef}
          source={{ html: mapHtml, baseUrl: 'https://openstreetmap.org' }}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          userAgent="ThelawalaVendorApp/1.0"
          style={{ flex: 1 }}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    borderTopWidth: 1,
    borderColor: '#1a4a7a',
    backgroundColor: '#0f0f23',
  },
  noHardwareView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noHardwareTitle: {
    color: '#e94560',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  noHardwareText: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  btn: {
    backgroundColor: '#e94560',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
});