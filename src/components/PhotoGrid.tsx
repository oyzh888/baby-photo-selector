import React, { useCallback } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { PhotoCandidate } from '../types';
import PhotoThumbnail from './PhotoThumbnail';

interface Props {
  candidates: PhotoCandidate[];
  selectedIds: Set<string>;
  onPressPhoto: (candidate: PhotoCandidate) => void;
  onLongPressPhoto: (candidate: PhotoCandidate) => void;
  showAddButton?: boolean;
}

export default function PhotoGrid({
  candidates, selectedIds, onPressPhoto, onLongPressPhoto, showAddButton = false,
}: Props) {
  const renderItem = useCallback(({ item }: { item: PhotoCandidate }) => (
    <PhotoThumbnail
      candidate={item}
      selected={selectedIds.has(item.localIdentifier)}
      onPress={onPressPhoto}
      onLongPress={onLongPressPhoto}
      showAddButton={showAddButton}
    />
  ), [selectedIds, onPressPhoto, onLongPressPhoto, showAddButton]);

  const keyExtractor = useCallback((item: PhotoCandidate) => item.localIdentifier, []);

  return (
    <FlatList
      data={candidates}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={3}
      contentContainerStyle={styles.grid}
      removeClippedSubviews
      maxToRenderPerBatch={30}
      windowSize={5}
    />
  );
}

const styles = StyleSheet.create({
  grid: { padding: 1 },
});
