import React, { useMemo, useCallback } from 'react';
import {
  View, Image, Text, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useScan } from '../context/ScanContext';
import ScoreBar from '../components/ScoreBar';

type Props = NativeStackScreenProps<RootStackParamList, 'PhotoPreview'>;
const { width, height } = Dimensions.get('window');

export default function PhotoPreviewScreen({ navigation, route }: Props) {
  const { candidateId } = route.params;
  const { scanResult, selectedIds, toggleSelected, removeSelected } = useScan();
  const insets = useSafeAreaInsets();

  const candidate = useMemo(
    () => scanResult?.candidates.find(c => c.localIdentifier === candidateId),
    [scanResult, candidateId]
  );

  const isSelected = selectedIds.has(candidateId);

  const handleRemove = useCallback(() => {
    removeSelected(candidateId);
    navigation.goBack();
  }, [candidateId, removeSelected, navigation]);

  const handleToggle = useCallback(() => {
    toggleSelected(candidateId);
  }, [candidateId, toggleSelected]);

  if (!candidate) {
    return (
      <View style={styles.center}>
        <Text>照片不存在</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: candidate.uri }}
        style={[styles.photo, { height: height * 0.55 }]}
        resizeMode="cover"
      />

      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 12 }]}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backText}>‹ 返回</Text>
      </TouchableOpacity>

      <View style={[styles.panel, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.panelTitle}>AI 评分详情</Text>
        <ScoreBar label="清晰度" value={candidate.scores.sharpness} color="#FF6B9D" />
        <ScoreBar label="宝宝概率" value={candidate.scores.babyProbability} color="#A78BFA" />
        <ScoreBar label="曝光" value={candidate.scores.exposure} color="#34D399" />
        <ScoreBar label="构图" value={candidate.scores.composition} color="#60A5FA" />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>综合得分</Text>
          <Text style={styles.totalValue}>{Math.round(candidate.scores.total * 100)}</Text>
        </View>

        <View style={styles.actions}>
          {isSelected ? (
            <TouchableOpacity style={styles.removeButton} onPress={handleRemove}>
              <Text style={styles.removeText}>从精选中移除</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.addButton} onPress={handleToggle}>
              <Text style={styles.addText}>添加到精选</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photo: { width },
  backButton: {
    position: 'absolute', left: 16,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  backText: { color: '#FFF', fontSize: 16 },
  panel: {
    flex: 1, backgroundColor: '#FFF9FB',
    borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24,
  },
  panelTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A2E', marginBottom: 16 },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderColor: '#EEE',
  },
  totalLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  totalValue: { fontSize: 22, fontWeight: '700', color: '#FF6B9D' },
  actions: { marginTop: 20 },
  removeButton: {
    backgroundColor: '#FFF', borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#FF6B9D',
  },
  removeText: { color: '#FF6B9D', fontSize: 16, fontWeight: '600' },
  addButton: {
    backgroundColor: '#FF6B9D', borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  addText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
