import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';

interface Props {
  progress: number; // 0–1
  label?: string;
}

export default function ProgressBar({ progress, label }: Props) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: widthAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <Text style={styles.percent}>{Math.round(progress * 100)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  label: { fontSize: 14, color: '#666', marginBottom: 8, textAlign: 'center' },
  track: { height: 8, backgroundColor: '#FFD6E7', borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#FF6B9D', borderRadius: 4 },
  percent: { fontSize: 13, color: '#999', textAlign: 'right', marginTop: 6 },
});
