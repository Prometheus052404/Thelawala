import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Platform,
} from 'react-native';
import type { VendorInfo } from '../types';

type Props = {
  vendor: VendorInfo;
  onRequestItem: (vendor: VendorInfo, itemName: string) => void;
  onClose: () => void;
  isPending: boolean;
};

export default function VendorSheet({ vendor, onRequestItem, onClose, isPending }: Props) {
  return (
    <View style={styles.sheet}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.vendorId}>{vendor.thelaId}</Text>
          <Text style={styles.vendorSub}>
            📍 {vendor.location.lat.toFixed(4)}, {vendor.location.lng.toFixed(4)}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Inventory */}
      <Text style={styles.sectionTitle}>Available Items</Text>

      {vendor.inventory.length === 0 ? (
        <Text style={styles.emptyText}>This vendor has no items listed.</Text>
      ) : (
        <FlatList
          data={vendor.inventory}
          keyExtractor={(item, i) => `${item.name}-${i}`}
          style={styles.list}
          renderItem={({ item }) => (
            <View style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
              </View>
              <TouchableOpacity
                style={[styles.requestBtn, isPending && styles.requestBtnDisabled]}
                onPress={() => onRequestItem(vendor, item.name)}
                disabled={isPending}
              >
                <Text style={styles.requestBtnText}>
                  {isPending ? '⏳' : '📤 Request'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'android' ? 16 : 34,
    maxHeight: '55%',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  vendorId: { color: '#0abde3', fontWeight: '800', fontSize: 20 },
  vendorSub: { color: '#777', fontSize: 11, marginTop: 4 },
  closeBtn: {
    backgroundColor: '#0f3460',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { color: '#aaa', fontSize: 16, fontWeight: 'bold' },

  sectionTitle: {
    color: '#e94560',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  emptyText: { color: '#555', fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
  list: { flexGrow: 0 },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#1a4a7a',
  },
  itemName: { color: '#ddd', fontWeight: '600', fontSize: 15 },
  itemQty: { color: '#777', fontSize: 12, marginTop: 2 },
  requestBtn: {
    backgroundColor: '#0abde3',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  requestBtnDisabled: { backgroundColor: '#555' },
  requestBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
});
