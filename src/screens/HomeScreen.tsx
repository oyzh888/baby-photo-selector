import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { loadScanResult } from '../services/storage';
import { useScan } from '../context/ScanContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { setScanResult, clearAll } = useScan();
  const [lastScanDate, setLastScanDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScanResult().then(result => {
      if (result) {
        setScanResult(result);
        setLastScanDate(new Date(result.scannedAt));
      }
      setLoading(false);
    });
  }, []);

  const handleStartScan = () => {
    clearAll();
    navigation.navigate('Permission');
  };

  const handleViewLast = () => {
    navigation.navigate('Results');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B9D" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.hero}>
        <Text style={styles.emoji}>👶</Text>
        <Text style={styles.title}>宝宝精选</Text>
        <Text style={styles.subtitle}>帮你从海量照片里{'\n'}找出宝宝最美的瞬间</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleStartScan}>
          <Text style={styles.primaryButtonText}>开始扫描</Text>
        </TouchableOpacity>

        {lastScanDate && (
          <TouchableOpacity style={styles.secondaryButton} onPress={handleViewLast}>
            <Text style={styles.secondaryButtonText}>查看上次结果</Text>
            <Text style={styles.secondaryButtonSub}>
              {lastScanDate.toLocaleDateString('zh-CN')} 扫描
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9FB', paddingHorizontal: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 72, marginBottom: 16 },
  title: { fontSize: 32, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  subtitle: { fontSize: 18, color: '#666', textAlign: 'center', lineHeight: 28 },
  actions: { gap: 12 },
  primaryButton: {
    backgroundColor: '#FF6B9D', borderRadius: 16, paddingVertical: 18,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#FFB3CC',
  },
  secondaryButtonText: { color: '#FF6B9D', fontSize: 16, fontWeight: '600' },
  secondaryButtonSub: { color: '#999', fontSize: 13, marginTop: 4 },
});
