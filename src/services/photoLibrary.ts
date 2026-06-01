import * as MediaLibrary from 'expo-media-library';

export interface RawAsset {
  id: string;
  uri: string;
  creationTime: number; // ms since epoch
  width: number;
  height: number;
}

/**
 * Fetches the most recent `count` photos sorted by creation time descending.
 * Returns only metadata + URI (no pixel data loaded).
 */
export async function fetchRecentPhotos(count: number = 1000): Promise<RawAsset[]> {
  const { assets } = await MediaLibrary.getAssetsAsync({
    mediaType: MediaLibrary.MediaType.photo,
    sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    first: count,
  });

  return assets.map(asset => ({
    id: asset.id,
    uri: asset.uri,
    creationTime: asset.creationTime,
    width: asset.width,
    height: asset.height,
  }));
}

/**
 * Given an asset ID, fetches the local file URI suitable for ML processing.
 * Uses localUri if available (avoids iCloud download), falls back to uri.
 */
export async function fetchThumbnailUri(assetId: string): Promise<string> {
  const info = await MediaLibrary.getAssetInfoAsync(assetId, {
    shouldDownloadFromNetwork: false,
  });
  return info.localUri ?? info.uri;
}

/**
 * Fetches assets by a specific list of IDs (used for limited-permission mode).
 */
export async function fetchAssetsByIds(ids: string[]): Promise<RawAsset[]> {
  const results = await Promise.all(
    ids.map(id => MediaLibrary.getAssetInfoAsync(id))
  );
  return results.map(info => ({
    id: info.id,
    uri: info.uri,
    creationTime: info.creationTime,
    width: info.width,
    height: info.height,
  }));
}

/**
 * Saves the given asset IDs to the "宝宝精选" system album.
 * Creates the album if it doesn't exist.
 */
export async function saveToFavoriteAlbum(assetIds: string[]): Promise<void> {
  const ALBUM_NAME = '宝宝精选';

  if (assetIds.length === 0) return;

  let album = await MediaLibrary.getAlbumAsync(ALBUM_NAME);

  if (!album) {
    album = await MediaLibrary.createAlbumAsync(ALBUM_NAME, assetIds[0], false);
    const remaining = assetIds.slice(1);
    if (remaining.length > 0) {
      await MediaLibrary.addAssetsToAlbumAsync(remaining, album, false);
    }
  } else {
    await MediaLibrary.addAssetsToAlbumAsync(assetIds, album, false);
  }
}
