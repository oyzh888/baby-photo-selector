import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, PhotoCandidate } from '../types';
import { useScan } from '../context/ScanContext';
import PhotoGrid from '../components/PhotoGrid';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;
type Tab = 'ai' | 'all';

export default function ResultsScreen({ navigation }: Props) {
  const { scanResult, selectedIds, removeSelected, addCandidate } = useScan();
  const [activeTab, setActiveTab] = useState<Tab>('ai');

  const aiCandidates = scanResult?.candidates ?? [];

  const allCandidates: PhotoCandidate[] = useMemo(() => {
    if (!scanResult) return [];
    const known = new Map(scanResult.candidates.map(c => [c.localIdentifier, c]));
    return scanResult.allAssetIds.map(id => known.get(id) ?? {
      localIdentifier: id,
      uri: '',
      creationTime: 0,
      width: 0,
      height: 0,
      scores: { sharpness: 0, babyProbability: 0, exposure: 0, composition: 0, total: 0 },
    });
  }, [scanResult]);

  const handlePressPhoto = useCallback((candidate: PhotoCandidate) => {
    navigation.push('PhotoPreview', { candidateId: candidate.localIdentifier });
  }, [navigation]);

  const handleLongPressPhoto = useCallback((candidate: PhotoCandidate) => {
    Alert.alert(
      '移除照片',
      '将此照片从精选中移除？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '移除', style: 'destructive',
          onPress: () => removeSelected(candidate.localIdentifier),
        },
      ]
    );
  }, [removeSelected]);

  const handleAddPhoto = useCallback((candidate: PhotoCandidate) => {
    addCandidate(candidate);
  }, [addCandidate]);

  const handleSave = useCallback(() => {
    const count = selectedIds.size;
    if (count === 0) {
      Alert.alert('请先选择照片', '至少选择一张照片再保存。');
      return;
    }
    navigation.replace('Done', { savedCount: count });
  }, [selectedIds, navigation]);

  const currentCandidates = activeTab === 'ai' ? aiCandidates : allCandidates;
  const selectedCount = selectedIds.size;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>为你找到 {aiCandidates.length} 张宝宝精选</Text>
          <Text style={styles.subtitle}>已选 {selectedCount} 张</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.replace('Permission')} style={styles.rescanBtn}>
          <Text style={styles.rescanText}>重新扫描</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ai' && styles.tabActive]}
          onPress={() => setActiveTab('ai')}
        >
          <Text style={[styles.tabText, activeTab === 'ai' && styles.tabTextActive]}>AI 精选</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>全部照片</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.gridWrapper}>
        <PhotoGrid
          candidates={currentCandidates}
          selectedIds={selectedIds}
          onPressPhoto={handlePressPhoto}
          onLongPressPhoto={activeTab === 'ai' ? handleLongPressPhoto : handleAddPhoto}
          showAddButton={activeTab === 'all'}
        />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>保存精选（{selectedCount} 张）</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9FB' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#1A1A2E' },
  subtitle: { fontSize: 14, color: '#999', marginTop: 2 },
  rescanBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  rescanText: { color: '#FF6B9D', fontSize: 14 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 },
  tab: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderBottomWidth: 2, borderColor: 'transparent',
  },
  tabActive: { borderColor: '#FF6B9D' },
  tabText: { fontSize: 15, color: '#999' },
  tabTextActive: { color: '#FF6B9D', fontWeight: '600' },
  gridWrapper: { flex: 1 },
  footer: { padding: 16, paddingBottom: 32 },
  saveButton: {
    backgroundColor: '#FF6B9D', borderRadius: 16, paddingVertical: 18, alignItems: 'center',
  },
  saveButtonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
});
