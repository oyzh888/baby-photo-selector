import React, { useCallback } from 'react';
import { TouchableOpacity, Image, View, StyleSheet, Dimensions } from 'react-native';
import { PhotoCandidate } from '../types';

const { width } = Dimensions.get('window');
const CELL_SIZE = (width - 4) / 3;

interface Props {
  candidate: PhotoCandidate;
  selected: boolean;
  onPress: (candidate: PhotoCandidate) => void;
  onLongPress: (candidate: PhotoCandidate) => void;
  showAddButton?: boolean;
}

export default function PhotoThumbnail({
  candidate, selected, onPress, onLongPress, showAddButton = false,
}: Props) {
  const handlePress = useCallback(() => onPress(candidate), [candidate, onPress]);
  const handleLongPress = useCallback(() => onLongPress(candidate), [candidate, onLongPress]);

  return (
    <TouchableOpacity
      style={styles.cell}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.85}
    >
      <Image source={{ uri: candidate.uri }} style={styles.image} />

      {selected && (
        <View style={styles.selectedOverlay}>
          <View style={styles.checkCircle}>
            <View style={styles.checkmark} />
          </View>
        </View>
      )}

      {showAddButton && !selected && (
        <View style={styles.addOverlay}>
          <View style={styles.addCircle}>
            <View style={styles.addLine1} />
            <View style={styles.addLine2} />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cell: { width: CELL_SIZE, height: CELL_SIZE, margin: 1 },
  image: { width: '100%', height: '100%' },
  selectedOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 107, 157, 0.25)',
    alignItems: 'flex-end',
    padding: 6,
  },
  checkCircle: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#FF6B9D', alignItems: 'center', justifyContent: 'center',
  },
  checkmark: {
    width: 12, height: 7,
    borderLeftWidth: 2, borderBottomWidth: 2,
    borderColor: '#FFF',
    transform: [{ rotate: '-45deg' }, { translateY: -2 }],
  },
  addOverlay: {
    ...StyleSheet.absoluteFill, alignItems: 'flex-end', padding: 6,
  },
  addCircle: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#FF6B9D',
  },
  addLine1: {
    position: 'absolute', width: 12, height: 2, backgroundColor: '#FF6B9D', borderRadius: 1,
  },
  addLine2: {
    position: 'absolute', width: 2, height: 12, backgroundColor: '#FF6B9D', borderRadius: 1,
  },
});
