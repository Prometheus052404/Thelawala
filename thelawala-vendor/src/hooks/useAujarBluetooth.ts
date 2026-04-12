import { useEffect, useRef, useState } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import * as Location from 'expo-location';
import base64 from 'react-native-base64';

const AUJAR_SERVICE_UUID = '7c2a4f7e-9d7b-4a8a-9f2b-08d67f5e2f01';
const AUJAR_CHARACTERISTIC_UUID = '7c2a4f7e-9d7b-4a8a-9f2b-08d67f5e2f02';

function base64ToBytes(value: string): Uint8Array {
  const binary = base64.decode(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeLatLng(value: string): { lat: number; lng: number } | null {
  const bytes = base64ToBytes(value);
  if (bytes.length < 8) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    lat: view.getFloat32(0, true),
    lng: view.getFloat32(4, true),
  };
}

export function useAujarBluetooth() {
  const [aujarActive, setAujarActive] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [bleDevice, setBleDevice] = useState<Device | null>(null);
  
  // We need to store the GPS listener so we can turn it off later
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const bleManagerRef = useRef<BleManager | null>(null);
  const bleMonitorRef = useRef<{ remove: () => void } | null>(null);

  const ensureBlePermissions = async () => {
    if (Platform.OS !== 'android') return true;
    const permissions: string[] = [];
    if (Platform.Version >= 31) {
      permissions.push(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      );
    } else {
      permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    }
    const results = await PermissionsAndroid.requestMultiple(permissions);
    return permissions.every((perm) => results[perm] === PermissionsAndroid.RESULTS.GRANTED);
  };

  const startPhoneGpsFallback = async () => {
    console.log('Requesting phone GPS permissions...');

    // Ask the Android OS for foreground location permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.error('Permission to access location was denied');
      return;
    }

    setAujarActive(true);
    console.log('GPS Permission Granted. Starting tracking...');

    // Tap into the phone's GPS chip
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 30000, // Get a new reading every 30 seconds
        distanceInterval: 1, // Or if the phone moves 1 meter
      },
      (loc) => {
        // Format the data exactly how the rest of the app expects it
        const currentLat = loc.coords.latitude;
        const currentLng = loc.coords.longitude;

        console.log(`[MOBILE GPS] Lat: ${currentLat}, Lng: ${currentLng}`);
        setLocation({ lat: currentLat, lng: currentLng });
      },
    );

    setLocationSubscription(subscription);
    locationSubscriptionRef.current = subscription;
  };

  const scanForDevices = async (timeoutMs: number) => {
    if (!bleManagerRef.current) bleManagerRef.current = new BleManager();

    const manager = bleManagerRef.current;
    const seen = new Map<string, Device>();

    return new Promise<Device[]>((resolve) => {
      const timeout = setTimeout(() => {
        manager.stopDeviceScan();
        resolve(Array.from(seen.values()));
      }, timeoutMs);

      manager.startDeviceScan([AUJAR_SERVICE_UUID], null, (error, device) => {
        if (error || !device) return;
        if (device.id && !seen.has(device.id)) {
          seen.set(device.id, device);
        }
      });

      return () => {
        clearTimeout(timeout);
        manager.stopDeviceScan();
      };
    });
  };

  const pickBleDevice = async () => {
    const devices = await scanForDevices(6000);
    if (devices.length === 0) return null;

    return new Promise<Device | null>((resolve) => {
      const buttons = devices.slice(0, 6).map((device) => ({
        text: device.name || device.localName || device.id,
        onPress: () => resolve(device),
      }));

      buttons.push({
        text: 'Rescan',
        onPress: async () => resolve(await pickBleDevice()),
      });
      buttons.push({
        text: 'Cancel',
        style: 'cancel' as const,
        onPress: () => resolve(null),
      });

      Alert.alert('Select AUJAR Device', 'Choose your AUJAR unit to connect.', buttons);
    });
  };

  const connectToAujar = async () => {
    const permissionsOk = await ensureBlePermissions();
    if (!permissionsOk) {
      console.warn('Bluetooth permissions denied; falling back to phone GPS.');
      await startPhoneGpsFallback();
      return;
    }

    try {
      const device = await pickBleDevice();
      if (!device) {
        await startPhoneGpsFallback();
        return;
      }

      if (!bleManagerRef.current) bleManagerRef.current = new BleManager();
      const manager = bleManagerRef.current;

      const connected = await manager.connectToDevice(device.id, { autoConnect: true });
      const readyDevice = await connected.discoverAllServicesAndCharacteristics();

      setBleDevice(readyDevice);
      setAujarActive(true);

      if (locationSubscription) {
        locationSubscription.remove();
        setLocationSubscription(null);
        locationSubscriptionRef.current = null;
      }

      bleMonitorRef.current?.remove();
      bleMonitorRef.current = readyDevice.monitorCharacteristicForService(
        AUJAR_SERVICE_UUID,
        AUJAR_CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error || !characteristic?.value) return;
          const decoded = decodeLatLng(characteristic.value);
          if (decoded) {
            console.log(`[AUJAR BLE] Lat: ${decoded.lat}, Lng: ${decoded.lng}`);
            setLocation(decoded);
          }
        },
      );
    } catch (error) {
      console.warn('BLE connection failed; falling back to phone GPS.', error);
      await startPhoneGpsFallback();
    }
  };

  const disconnectAujar = async () => {
    if (locationSubscription) {
      locationSubscription.remove(); // Stop the GPS sensor to save battery
      setLocationSubscription(null);
    }
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }
    bleMonitorRef.current?.remove();
    bleMonitorRef.current = null;
    if (bleDevice) {
      try {
        await bleDevice.cancelConnection();
      } catch {
        // Ignore disconnect errors
      }
      setBleDevice(null);
    }
    setAujarActive(false);
    setLocation(null);
    console.log("Stopped Mobile GPS tracking.");
  };

  // Cleanup if the app closes
  useEffect(() => {
    return () => {
      locationSubscriptionRef.current?.remove();
      bleMonitorRef.current?.remove();
      bleManagerRef.current?.destroy();
    };
  }, []);

  return { aujarActive, location, connectToAujar, disconnectAujar };
}