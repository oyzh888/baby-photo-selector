import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, ScanResult, ScanProgress } from '../types';
import { fetchRecentPhotos } from '../services/photoLibrary';
import { runScan } from '../services/scanPipeline';
import { saveScanResult } from '../services/storage';
import { useScan } from '../context/ScanContext';
import { DEFAULT_SCORING_CONFIG } from '../config/scoringConfig';
import ProgressBar from '../components/ProgressBar';

type Props = NativeStackScreenProps<RootStackParamList, 'Scanning'>;

export default function ScanningScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { setScanResult } = useScan();
  const [progress, setProgress] = useState<ScanProgress>({
    processed: 0,
    total: 1000,
    estimatedSecondsRemaining: 0,
  });
  const abortRef = useRef(new AbortController());

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    async function startScan() {
      const assets = await fetchRecentPhotos(1000);
      const allAssetIds = assets.map(a => a.id);

      const candidates = await runScan(
        assets,
        DEFAULT_SCORING_CONFIG,
        (p) => setProgress(p),
        controller.signal
      );

      if (controller.signal.aborted) return;

      const scanResult: ScanResult = {
        scannedAt: Date.now(),
        totalScanned: assets.length,
        candidates,
        allAssetIds,
        selected: candidates.map(c => c.localIdentifier),
      };

      await saveScanResult(scanResult);
      setScanResult(scanResult);
      navigation.replace('Results');
    }

    startScan();
    return () => controller.abort();
  }, []);

  const progressFraction = progress.total > 0 ? progress.processed / progress.total : 0;
  const eta = Math.ceil(progress.estimatedSecondsRemaining);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom }]}>
      <Text style={styles.emoji}>🔍</Text>
      <Text style={styles.title}>正在分析照片…</Text>
      <Text style={styles.subtitle}>
        第 {progress.processed} / {progress.total} 张
        {eta > 0 ? `，预计还需 ${eta} 秒` : ''}
      </Text>
      <View style={styles.barWrapper}>
        <ProgressBar progress={progressFraction} />
      </View>
      <Text style={styles.hint}>可以锁屏，扫描会在后台继续</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#FFF9FB', paddingHorizontal: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  emoji: { fontSize: 64, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A2E', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 32, textAlign: 'center' },
  barWrapper: { width: '100%', marginBottom: 20 },
  hint: { fontSize: 14, color: '#AAA' },
});
