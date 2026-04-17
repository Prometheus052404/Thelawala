import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useAujarBluetooth } from '../hooks/useAujarBluetooth';

export default function LiveVendorMapScreen() {
  // Pull in the Bluetooth hook
  const { aujarActive, location, connectToAujar, disconnectAujar } = useAujarBluetooth();

  // Fallback map region if we don't have a location yet
  const defaultRegion = {
    latitude: 12.8781, 
    longitude: 80.1416,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View style={styles.container}>
      {/* Status Header with Connection Button */}
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {aujarActive ? '🟢 System Active: Tracking GPS' : '🔴 System Inactive'}
        </Text>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={aujarActive ? disconnectAujar : connectToAujar}
        >
          <Text style={styles.buttonText}>
            {aujarActive ? 'Stop Tracking' : 'Connect to ESP32 (AUJAR)'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* The Interactive Map */}
      <MapView 
        style={styles.map}
        region={location ? {
          latitude: location.lat,
          longitude: location.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        } : defaultRegion}
      >
        {/* Only show the marker if we actually have location data */}
        {location && (
          <Marker 
            coordinate={{
              latitude: location.lat,
              longitude: location.lng
            }}
            title="My Thela"
            description="Broadcasting Location"
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 120,
    backgroundColor: '#1e1e1e',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 10,
  },
  headerText: {
    color: '#00ff00',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  map: { flex: 1 },
});