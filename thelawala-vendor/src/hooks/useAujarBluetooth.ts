import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export function useAujarBluetooth() {
  const [aujarActive, setAujarActive] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // We need to store the GPS listener so we can turn it off later
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);

  const connectToAujar = async () => {
    console.log("Requesting phone GPS permissions...");
    
    // 1. Ask the Android OS for foreground location permissions
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.error("Permission to access location was denied");
      return;
    }

    setAujarActive(true);
    console.log("GPS Permission Granted. Starting tracking...");

    // 2. Tap into the phone's GPS chip
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // Get a new reading every 5 seconds
        distanceInterval: 1, // Or if the phone moves 1 meter
      },
      (loc) => {
        // 3. Format the data exactly how the rest of the app expects it
        const currentLat = loc.coords.latitude;
        const currentLng = loc.coords.longitude;
        
        console.log(`[MOBILE GPS] Lat: ${currentLat}, Lng: ${currentLng}`);
        setLocation({ lat: currentLat, lng: currentLng });
      }
    );

    setLocationSubscription(subscription);
  };

  const disconnectAujar = () => {
    if (locationSubscription) {
      locationSubscription.remove(); // Stop the GPS sensor to save battery
      setLocationSubscription(null);
    }
    setAujarActive(false);
    setLocation(null);
    console.log("Stopped Mobile GPS tracking.");
  };

  // Cleanup if the app closes
  useEffect(() => {
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [locationSubscription]);

  return { aujarActive, location, connectToAujar, disconnectAujar };
}