import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import type { VendorInfo } from '../types';

type Props = {
  onSearch: (query: string, type: 'vendor' | 'item') => Promise<void>;
  results: VendorInfo[] | null;
  onSelectVendor: (v: VendorInfo) => void;
  onClose: () => void;
};

export default function SearchPanel({ onSearch, results, onSelectVendor, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'vendor' | 'item'>('item');
  const [loading, setLoading] = useState(false);

  const doSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    await onSearch(query.trim(), searchType);
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeBtn}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Search type toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, searchType === 'item' && styles.toggleActive]}
          onPress={() => setSearchType('item')}
        >
          <Text style={[styles.toggleText, searchType === 'item' && styles.toggleTextActive]}>
            By Item
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, searchType === 'vendor' && styles.toggleActive]}
          onPress={() => setSearchType('vendor')}
        >
          <Text style={[styles.toggleText, searchType === 'vendor' && styles.toggleTextActive]}>
            By Thela ID
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={searchType === 'item' ? 'e.g. Onions, Tomatoes...' : 'e.g. thela123'}
          placeholderTextColor="#666"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          onSubmitEditing={doSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={doSearch} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.searchBtnText}>Go</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Results */}
      {results !== null && (
        <View style={styles.resultsWrap}>
          {results.length === 0 ? (
            <Text style={styles.noResults}>No vendors found for "{query}"</Text>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item, i) => `${item.thelaId}-${i}`}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.resultItem} onPress={() => onSelectVendor(item)}>
                  <Text style={styles.resultIcon}>🛒</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName}>{item.thelaId}</Text>
                    <Text style={styles.resultSub}>
                      {item.inventory.map((i) => `${i.name} (${i.quantity})`).join(', ')}
                    </Text>
                  </View>
                  <Text style={styles.resultArrow}>›</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: '#1a4a7a',
    maxHeight: 380,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: { color: '#0abde3', fontWeight: '700', fontSize: 16 },
  closeBtn: { color: '#aaa', fontSize: 20, padding: 4 },

  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#0f3460',
    borderWidth: 1,
    borderColor: '#1a4a7a',
  },
  toggleActive: { backgroundColor: '#0abde3', borderColor: '#0abde3' },
  toggleText: { color: '#999', fontWeight: '600', fontSize: 13 },
  toggleTextActive: { color: '#fff' },

  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  input: {
    flex: 1,
    backgroundColor: '#0f3460',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#1a4a7a',
  },
  searchBtn: {
    backgroundColor: '#0abde3',
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  resultsWrap: { maxHeight: 200 },
  noResults: { color: '#777', textAlign: 'center', paddingVertical: 16, fontSize: 13, fontStyle: 'italic' },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#1a4a7a',
  },
  resultIcon: { fontSize: 18, marginRight: 10 },
  resultName: { color: '#ddd', fontWeight: '600', fontSize: 14 },
  resultSub: { color: '#777', fontSize: 11, marginTop: 2 },
  resultArrow: { color: '#0abde3', fontSize: 22, fontWeight: 'bold' },
});
