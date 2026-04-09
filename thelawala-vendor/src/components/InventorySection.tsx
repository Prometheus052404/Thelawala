import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';

export type StockItem = { id: string; name: string; quantity: number };

type InventoryProps = {
  stock: StockItem[];
  itemName: string;
  setItemName: (val: string) => void;
  itemQty: string;
  setItemQty: (val: string) => void;
  onAddItem: () => void;
  onUpdateQuantity: (id: string, amount: number) => void;
  onDeleteItem: (id: string) => void;
};

export default function InventorySection({
  stock,
  itemName,
  setItemName,
  itemQty,
  setItemQty,
  onAddItem,
  onUpdateQuantity,
  onDeleteItem,
}: InventoryProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>📦 Today's Inventory</Text>

      {/* INPUT ROW */}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, styles.qtyInput]}
          placeholder="Qty"
          placeholderTextColor="#666"
          keyboardType="numeric"
          value={itemQty}
          onChangeText={setItemQty}
        />
        <TextInput
          style={[styles.input, styles.nameInput]}
          placeholder="Item name (e.g. Tomatoes)"
          placeholderTextColor="#666"
          value={itemName}
          onChangeText={setItemName}
        />
        <TouchableOpacity style={styles.addButton} onPress={onAddItem}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* LIST */}
      {stock.length === 0 ? (
        <Text style={styles.emptyText}>No items yet — add your stock above</Text>
      ) : (
        <FlatList
          data={stock}
          keyExtractor={item => item.id}
          style={styles.list}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <TouchableOpacity onPress={() => onDeleteItem(item.id)} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>

              <Text style={styles.itemName} numberOfLines={1}>
                {item.name}
              </Text>

              <View style={styles.qtyControls}>
                <TouchableOpacity
                  onPress={() => onUpdateQuantity(item.id, -1)}
                  style={styles.qtyBtn}
                >
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity
                  onPress={() => onUpdateQuantity(item.id, 1)}
                  style={styles.qtyBtn}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { maxHeight: 300, paddingHorizontal: 14, paddingTop: 12 },
  sectionTitle: {
    color: '#e94560',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  input: {
    backgroundColor: '#16213e',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1a4a7a',
    fontSize: 14,
  },
  qtyInput: { width: 60, textAlign: 'center' },
  nameInput: { flex: 1 },
  addButton: {
    backgroundColor: '#e94560',
    width: 46,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  emptyText: { color: '#555', textAlign: 'center', marginTop: 16, fontSize: 13, fontStyle: 'italic' },
  list: { marginTop: 4 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    padding: 10,
    marginBottom: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1a4a7a',
  },
  deleteBtn: {
    backgroundColor: '#e94560',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  deleteText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  itemName: { flex: 1, fontSize: 15, fontWeight: '500', color: '#ddd' },
  qtyControls: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: {
    backgroundColor: '#0f3460',
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  qtyText: { marginHorizontal: 12, fontSize: 17, fontWeight: 'bold', color: '#fff' },
});