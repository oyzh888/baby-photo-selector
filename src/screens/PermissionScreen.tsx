import React, { useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Linking,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Permission'>;

export default function PermissionScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const handleRequestFull = useCallback(async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync(false);

    if (status === 'granted') {
      navigation.replace('Scanning', { mode: 'full' });
    } else if ((status as string) === 'limited') {
      navigation.replace('Scanning', { mode: 'limited' });
    } else {
      Alert.alert(
        '需要相册权限',
        '请在设置中允许宝宝精选访问您的相册',
        [
          { text: '取消', style: 'cancel' },
          { text: '去设置', onPress: () => Linking.openSettings() },
        ]
      );
    }
  }, [navigation]);

  const handleSelectPhotos = useCallback(async () => {
    await MediaLibrary.requestPermissionsAsync(true);
    const { status } = await MediaLibrary.getPermissionsAsync();

    if (status === 'granted' || (status as string) === 'limited') {
      navigation.replace('Scanning', { mode: 'limited' });
    }
  }, [navigation]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.hero}>
        <Text style={styles.emoji}>🔒</Text>
        <Text style={styles.title}>需要访问您的相册</Text>
        <Text style={styles.desc}>
          宝宝精选需要读取您的照片来找出宝宝的精彩瞬间。{'\n\n'}
          <Text style={styles.highlight}>所有分析均在您的手机本地完成，照片不会上传到任何服务器。</Text>
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleRequestFull}>
          <Text style={styles.primaryButtonText}>允许访问全部照片</Text>
          <Text style={styles.primaryButtonSub}>自动扫描最近 1000 张</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleSelectPhotos}>
          <Text style={styles.secondaryButtonText}>只选择部分照片</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9FB', paddingHorizontal: 24 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 64, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A2E', marginBottom: 16, textAlign: 'center' },
  desc: { fontSize: 16, color: '#555', textAlign: 'center', lineHeight: 26 },
  highlight: { color: '#FF6B9D', fontWeight: '600' },
  actions: { gap: 12 },
  primaryButton: {
    backgroundColor: '#FF6B9D', borderRadius: 16, paddingVertical: 18, alignItems: 'center',
  },
  primaryButtonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  primaryButtonSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
  secondaryButton: {
    backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#FFB3CC',
  },
  secondaryButtonText: { color: '#FF6B9D', fontSize: 16, fontWeight: '600' },
});
