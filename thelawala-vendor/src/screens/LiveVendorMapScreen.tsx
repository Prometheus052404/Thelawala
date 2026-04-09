import React, { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function LiveVendorMapScreen() {
  // State to hold the vendor's current coordinates
  const [currentLocation, setCurrentLocation] = useState({
    latitude: 12.8781, 
    longitude: 80.1416,
    latitudeDelta: 0.01, // Controls how zoomed in the map is
    longitudeDelta: 0.01,
  });

  return (
    <View style={styles.container}>
      {/* Status Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>🟢 System Active: Waiting for GPS Module...</Text>
      </View>

      {/* The Interactive Map */}
      <MapView 
        style={styles.map}
        region={currentLocation}
      >
        {/* The moving pin representing the Thelawala */}
        <Marker 
          coordinate={{
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude
          }}
          title="My Thela"
          description="Broadcasting Location"
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 80,
    backgroundColor: '#1e1e1e',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 15,
  },
  headerText: {
    color: '#00ff00', // Hacker green for the prototype terminal feel
    fontWeight: 'bold',
  },
  map: {
    flex: 1, 
  },
});