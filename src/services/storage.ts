import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScanResult } from '../types';

const STORAGE_KEY = '@baby_photo_selector/scan_result';

export async function saveScanResult(result: ScanResult): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(result));
}

export async function loadScanResult(): Promise<ScanResult | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ScanResult;
  } catch {
    return null;
  }
}

export async function clearScanResult(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
