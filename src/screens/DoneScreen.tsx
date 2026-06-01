import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Share, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { saveToFavoriteAlbum } from '../services/photoLibrary';
import { useScan } from '../context/ScanContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Done'>;

export default function DoneScreen({ navigation, route }: Props) {
  const { savedCount } = route.params;
  const insets = useSafeAreaInsets();
  const { selectedIds, clearAll } = useScan();
  const [saving, setSaving] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const savedRef = useRef(false);

  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;

    saveToFavoriteAlbum([...selectedIds])
      .catch(err => setError(typeof err?.message === 'string' ? err.message : '保存失败'))
      .finally(() => setSaving(false));
  }, []);

  const handleOpenPhotos = () => {
    Linking.openURL('photos-redirect://').catch(() => {});
  };

  const handleShare = async () => {
    await Share.share({
      message: `我用「宝宝精选」从相册里找出了 ${savedCount} 张宝宝的精彩瞬间！`,
    });
  };

  const handleRescan = () => {
    clearAll();
    navigation.replace('Permission');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.hero}>
        <Text style={styles.emoji}>{saving ? '⏳' : error ? '❌' : '🎉'}</Text>
        <Text style={styles.title}>
          {saving ? '正在保存…' : error ? '保存失败' : `已保存 ${savedCount} 张`}
        </Text>
        <Text style={styles.subtitle}>
          {saving
            ? '正在写入「宝宝精选」相册'
            : error
            ? error
            : '已添加到系统相册「宝宝精选」文件夹'}
        </Text>
      </View>

      {!saving && (
        <View style={styles.actions}>
          {!error && (
            <TouchableOpacity style={styles.primaryButton} onPress={handleOpenPhotos}>
              <Text style={styles.primaryButtonText}>在系统相册查看</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.secondaryButton} onPress={handleShare}>
            <Text style={styles.secondaryButtonText}>分享给家人</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tertiaryButton} onPress={handleRescan}>
            <Text style={styles.tertiaryButtonText}>重新扫描</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9FB', paddingHorizontal: 24 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 72, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#1A1A2E', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24 },
  actions: { gap: 12 },
  primaryButton: {
    backgroundColor: '#FF6B9D', borderRadius: 16, paddingVertical: 18, alignItems: 'center',
  },
  primaryButtonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#FFB3CC',
  },
  secondaryButtonText: { color: '#FF6B9D', fontSize: 16, fontWeight: '600' },
  tertiaryButton: { paddingVertical: 14, alignItems: 'center' },
  tertiaryButtonText: { color: '#AAA', fontSize: 15 },
});
