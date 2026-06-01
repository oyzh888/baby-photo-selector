import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  label: string;
  value: number; // 0–1
  color?: string;
}

export default function ScoreBar({ label, value, color = '#FF6B9D' }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${value * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.value}>{Math.round(value * 100)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  label: { width: 60, fontSize: 13, color: '#666' },
  track: { flex: 1, height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  value: { width: 36, textAlign: 'right', fontSize: 13, color: '#999' },
});
