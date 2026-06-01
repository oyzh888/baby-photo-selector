export interface PhotoScores {
  sharpness: number;
  babyProbability: number;
  exposure: number;
  composition: number;
  total: number;
}

export interface PhotoCandidate {
  localIdentifier: string;
  uri: string;
  creationTime: number;
  width: number;
  height: number;
  scores: PhotoScores;
}

export interface ScanResult {
  scannedAt: number;
  totalScanned: number;
  candidates: PhotoCandidate[];
  allAssetIds: string[];
  selected: string[];
}

export interface ScanProgress {
  processed: number;
  total: number;
  estimatedSecondsRemaining: number;
}

export type RootStackParamList = {
  Home: undefined;
  Permission: undefined;
  Scanning: { mode: 'full' | 'limited'; assetIds?: string[] };
  Results: undefined;
  PhotoPreview: { candidateId: string };
  Done: { savedCount: number };
};
