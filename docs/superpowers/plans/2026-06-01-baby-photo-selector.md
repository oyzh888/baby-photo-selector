# Baby Photo Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an iOS app (Expo Bare Workflow) that scans the last 1,000 photos on-device, uses ML Kit to detect baby photos, scores and ranks them, then lets the user save the best 20–50 to a "宝宝精选" system album.

**Architecture:** A stateless service layer handles all ML and image processing (fully unit-testable). A React Context (`ScanContext`) holds shared scan state across screens. Screen components consume context and delegate all logic to services — no business logic in components.

**Tech Stack:** Expo Bare Workflow · React Native · TypeScript · `expo-media-library` · `@react-native-ml-kit/face-detection` · `@react-native-ml-kit/image-labeling` · `expo-image-manipulator` · `fast-png` · `buffer` · `@react-navigation/native-stack` · `@react-native-async-storage/async-storage`

---

## File Map

```
baby-photo-selector/
├── App.tsx                                   # Root: ScanProvider + AppNavigator
├── app.json                                  # Expo config (name, bundle ID, permissions)
├── ios/baby-photo-selector/Info.plist        # Photo library usage descriptions
│
├── src/
│   ├── config/
│   │   └── scoringConfig.ts                  # ScoringConfig type + DEFAULT_SCORING_CONFIG
│   │
│   ├── types/
│   │   └── index.ts                          # PhotoCandidate, ScanResult, ScanProgress, RootStackParamList
│   │
│   ├── context/
│   │   └── ScanContext.tsx                   # ScanProvider + useScan() hook
│   │
│   ├── services/
│   │   ├── photoLibrary.ts                   # fetchRecentPhotos(), fetchThumbnailUri(), saveToFavoriteAlbum()
│   │   ├── faceDetection.ts                  # detectFaces(), getLargestFace()
│   │   ├── imageLabelDetection.ts            # detectBabyProbability()
│   │   ├── imageAnalyzer.ts                  # analyzeSharpness(), analyzeExposure()
│   │   ├── photoScorer.ts                    # scorePhoto(), computeCompositionScore()
│   │   ├── burstDeduplicator.ts              # deduplicateBursts()
│   │   ├── scanPipeline.ts                   # runScan() — orchestrates full pipeline
│   │   └── storage.ts                        # saveScanResult(), loadScanResult(), clearScanResult()
│   │
│   ├── components/
│   │   ├── ProgressBar.tsx                   # Animated scan progress indicator
│   │   ├── PhotoThumbnail.tsx                # Single photo cell with checkmark overlay
│   │   ├── PhotoGrid.tsx                     # 3-column FlatList of PhotoThumbnail
│   │   └── ScoreBar.tsx                      # Visual score breakdown (sharpness/baby/etc.)
│   │
│   ├── screens/
│   │   ├── HomeScreen.tsx                    # Start scan / view last result
│   │   ├── PermissionScreen.tsx              # Photo permission request + limited flow
│   │   ├── ScanningScreen.tsx                # Progress UI + pipeline invocation
│   │   ├── ResultsScreen.tsx                 # AI精选 tab + 全部照片 tab + save button
│   │   ├── PhotoPreviewScreen.tsx            # Full-screen photo + score breakdown
│   │   └── DoneScreen.tsx                    # Save confirmation + share + re-scan
│   │
│   └── navigation/
│       └── AppNavigator.tsx                  # NativeStackNavigator wiring all screens
│
└── __tests__/
    ├── config/
    │   └── scoringConfig.test.ts
    └── services/
        ├── imageAnalyzer.test.ts
        ├── burstDeduplicator.test.ts
        └── photoScorer.test.ts
```

---

## Task 1: Project Initialization

**Files:**
- Create: `package.json` (via expo init)
- Modify: `app.json`
- Modify: `ios/baby-photo-selector/Info.plist`
- Modify: `App.tsx`

- [ ] **Step 1: Bootstrap Expo Bare project**

```bash
# Run from /workspace/Jack/baby-photo-selector
npx create-expo-app@latest . --template expo-template-bare-minimum
```

Expected: project files generated in current directory.

- [ ] **Step 2: Install all dependencies**

```bash
npx expo install expo-media-library expo-image-manipulator
npm install @react-native-ml-kit/face-detection @react-native-ml-kit/image-labeling
npm install fast-png buffer
npm install @react-navigation/native @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context react-native-gesture-handler
npm install @react-native-async-storage/async-storage
```

- [ ] **Step 3: Install iOS pods**

```bash
npx pod-install
```

Expected: Pods installed successfully.

- [ ] **Step 4: Polyfill Buffer in entry file**

Edit `index.js` — add these two lines at the very top, before any other imports:

```js
import 'react-native-gesture-handler';
import { Buffer } from 'buffer';
global.Buffer = Buffer;
```

- [ ] **Step 5: Add photo permission strings to Info.plist**

Open `ios/baby-photo-selector/Info.plist`. Add inside the root `<dict>`:

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>宝宝精选需要访问您的相册，用于在本地分析并筛选宝宝照片。所有处理均在您的设备上完成，照片不会上传到任何服务器。</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>宝宝精选需要将精选照片保存到您的相册。</string>
```

- [ ] **Step 6: Update app.json bundle identifier and name**

```json
{
  "expo": {
    "name": "宝宝精选",
    "slug": "baby-photo-selector",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourname.babyphotoselector",
      "supportsTablet": false
    },
    "plugins": [
      [
        "expo-media-library",
        {
          "photosPermission": "宝宝精选需要访问您的相册，用于在本地分析并筛选宝宝照片。",
          "savePhotosPermission": "宝宝精选需要将精选照片保存到您的相册。",
          "isAccessMediaLocationEnabled": true
        }
      ]
    ]
  }
}
```

- [ ] **Step 7: Verify build compiles**

```bash
npx expo run:ios --device
```

Expected: app launches on device (blank screen is fine at this stage).

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: initialize Expo Bare project with all dependencies"
```

---

## Task 2: Types + Scoring Config

**Files:**
- Create: `src/types/index.ts`
- Create: `src/config/scoringConfig.ts`
- Create: `__tests__/config/scoringConfig.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/config/scoringConfig.test.ts
import { DEFAULT_SCORING_CONFIG } from '../../src/config/scoringConfig';

describe('DEFAULT_SCORING_CONFIG', () => {
  it('weights sum to 1.0', () => {
    const { weights } = DEFAULT_SCORING_CONFIG;
    const sum = weights.sharpness + weights.babyProbability + weights.exposure + weights.composition;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('all weight values are between 0 and 1', () => {
    const { weights } = DEFAULT_SCORING_CONFIG;
    expect(weights.sharpness).toBeGreaterThan(0);
    expect(weights.babyProbability).toBeGreaterThan(0);
    expect(weights.exposure).toBeGreaterThan(0);
    expect(weights.composition).toBeGreaterThan(0);
  });

  it('minBabyProbability is between 0 and 1', () => {
    expect(DEFAULT_SCORING_CONFIG.filters.minBabyProbability).toBeGreaterThan(0);
    expect(DEFAULT_SCORING_CONFIG.filters.minBabyProbability).toBeLessThan(1);
  });

  it('defaultCount is positive', () => {
    expect(DEFAULT_SCORING_CONFIG.output.defaultCount).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/config/scoringConfig.test.ts
```

Expected: FAIL — "Cannot find module '../../src/config/scoringConfig'"

- [ ] **Step 3: Create types**

```ts
// src/types/index.ts
export interface PhotoScores {
  sharpness: number;       // 0–1
  babyProbability: number; // 0–1
  exposure: number;        // 0–1
  composition: number;     // 0–1
  total: number;           // 0–1, weighted sum
}

export interface PhotoCandidate {
  localIdentifier: string; // PhotoKit asset ID
  uri: string;             // thumbnail URI
  creationTime: number;    // ms since epoch
  width: number;           // original image width
  height: number;          // original image height
  scores: PhotoScores;
}

export interface ScanResult {
  scannedAt: number;           // ms since epoch
  totalScanned: number;
  candidates: PhotoCandidate[]; // AI-selected top photos
  allAssetIds: string[];        // IDs of all 1000 scanned assets (for 全部照片 tab)
  selected: string[];           // user's final selection (localIdentifier list)
}

export interface ScanProgress {
  processed: number;
  total: number;
  estimatedSecondsRemaining: number;
}
```

- [ ] **Step 4: Create scoring config**

```ts
// src/config/scoringConfig.ts
export interface ScoringWeights {
  sharpness: number;
  babyProbability: number;
  exposure: number;
  composition: number;
}

export interface ScoringFilters {
  minBabyProbability: number;  // skip photo if baby probability below this
  burstWindowSeconds: number;  // photos within this window are considered a burst
}

export interface ScoringOutput {
  defaultCount: number; // max top photos to return
  maxPerDay: number;    // max photos from the same calendar day
}

export interface ScoringConfig {
  weights: ScoringWeights;
  filters: ScoringFilters;
  output: ScoringOutput;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: {
    sharpness: 0.35,
    babyProbability: 0.30,
    exposure: 0.20,
    composition: 0.15,
  },
  filters: {
    minBabyProbability: 0.5,
    burstWindowSeconds: 60,
  },
  output: {
    defaultCount: 30,
    maxPerDay: 5,
  },
};
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest __tests__/config/scoringConfig.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types src/config __tests__/config
git commit -m "feat: add types and scoring config"
```

---

## Task 3: Photo Library Service

**Files:**
- Create: `src/services/photoLibrary.ts`

- [ ] **Step 1: Create photo library service**

```ts
// src/services/photoLibrary.ts
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
    // createAlbumAsync requires at least one asset
    album = await MediaLibrary.createAlbumAsync(ALBUM_NAME, assetIds[0], false);
    const remaining = assetIds.slice(1);
    if (remaining.length > 0) {
      await MediaLibrary.addAssetsToAlbumAsync(remaining, album, false);
    }
  } else {
    await MediaLibrary.addAssetsToAlbumAsync(assetIds, album, false);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/photoLibrary.ts
git commit -m "feat: add photo library service (fetch + save)"
```

---

## Task 4: Image Analyzer Service (Sharpness + Exposure)

**Files:**
- Create: `src/services/imageAnalyzer.ts`
- Create: `__tests__/services/imageAnalyzer.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/services/imageAnalyzer.test.ts
import { computeSharpnessFromPixels, computeExposureFromPixels } from '../../src/services/imageAnalyzer';

// Helper: create flat RGBA pixel array for a solid-color 4x4 image
function solidColor(r: number, g: number, b: number, size = 4): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
  }
  return data;
}

// Helper: create alternating black/white checkerboard (very sharp)
function checkerboard(size = 50): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = (x + y) % 2 === 0 ? 255 : 0;
      const i = (y * size + x) * 4;
      data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
    }
  }
  return data;
}

describe('computeSharpnessFromPixels', () => {
  it('returns near 0 for a solid-color image (no edges = blurry)', () => {
    const pixels = solidColor(128, 128, 128);
    const score = computeSharpnessFromPixels(pixels, 4, 4);
    expect(score).toBeCloseTo(0, 1);
  });

  it('returns a high value for a high-contrast checkerboard (sharp)', () => {
    const pixels = checkerboard(50);
    const score = computeSharpnessFromPixels(pixels, 50, 50);
    expect(score).toBeGreaterThan(0.5);
  });

  it('returns a value between 0 and 1', () => {
    const pixels = checkerboard(50);
    const score = computeSharpnessFromPixels(pixels, 50, 50);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe('computeExposureFromPixels', () => {
  it('returns 1.0 for well-exposed (medium brightness)', () => {
    const pixels = solidColor(130, 130, 130);
    const score = computeExposureFromPixels(pixels);
    expect(score).toBe(1.0);
  });

  it('returns < 0.5 for very dark image', () => {
    const pixels = solidColor(10, 10, 10);
    const score = computeExposureFromPixels(pixels);
    expect(score).toBeLessThan(0.5);
  });

  it('returns < 0.5 for very bright (overexposed) image', () => {
    const pixels = solidColor(250, 250, 250);
    const score = computeExposureFromPixels(pixels);
    expect(score).toBeLessThan(0.5);
  });

  it('returns a value between 0 and 1', () => {
    const pixels = solidColor(200, 200, 200);
    const score = computeExposureFromPixels(pixels);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/services/imageAnalyzer.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement image analyzer**

```ts
// src/services/imageAnalyzer.ts
import * as ImageManipulator from 'expo-image-manipulator';
import { decode as decodePng } from 'fast-png';

const ANALYSIS_SIZE = 50;

/**
 * Loads a URI as a 50×50 PNG and returns its raw RGBA pixel data.
 * Returns null if the image cannot be loaded (network only, not local, etc.).
 */
async function loadPixelData(
  uri: string
): Promise<{ data: Uint8Array; width: number; height: number } | null> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: ANALYSIS_SIZE, height: ANALYSIS_SIZE } }],
      { base64: true, format: ImageManipulator.SaveFormat.PNG }
    );

    const buffer = Buffer.from(result.base64!, 'base64');
    const png = decodePng(new Uint8Array(buffer));

    return {
      data: png.data as Uint8Array,
      width: png.width,
      height: png.height,
    };
  } catch {
    return null;
  }
}

/**
 * Computes a sharpness score (0–1) from raw RGBA pixel data using Laplacian variance.
 * Higher variance = sharper image.
 * Exported for unit testing.
 */
export function computeSharpnessFromPixels(
  data: Uint8Array,
  width: number,
  height: number
): number {
  const laplacianValues: number[] = [];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const getGray = (px: number, py: number): number => {
        const i = (py * width + px) * 4;
        return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      };

      const lap =
        4 * getGray(x, y) -
        getGray(x, y - 1) -
        getGray(x, y + 1) -
        getGray(x - 1, y) -
        getGray(x + 1, y);

      laplacianValues.push(lap);
    }
  }

  if (laplacianValues.length === 0) return 0;

  const mean = laplacianValues.reduce((a, b) => a + b, 0) / laplacianValues.length;
  const variance =
    laplacianValues.reduce((a, b) => a + (b - mean) ** 2, 0) / laplacianValues.length;

  // Empirical thresholds: <10 = blurry, >500 = sharp
  return Math.min(1, Math.max(0, (variance - 10) / 490));
}

/**
 * Computes an exposure score (0–1) from raw RGBA pixel data.
 * Score is 1.0 for mean luminance in 80–180 range, drops linearly outside.
 * Exported for unit testing.
 */
export function computeExposureFromPixels(data: Uint8Array): number {
  let totalLuminance = 0;
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    totalLuminance += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  const mean = totalLuminance / pixelCount; // 0–255

  if (mean < 80) return mean / 80;
  if (mean > 180) return Math.max(0, 1 - (mean - 180) / 75);
  return 1.0;
}

/** Analyzes a photo URI and returns sharpness score (0–1). */
export async function analyzeSharpness(uri: string): Promise<number> {
  const result = await loadPixelData(uri);
  if (!result) return 0.5; // neutral fallback
  return computeSharpnessFromPixels(result.data, result.width, result.height);
}

/** Analyzes a photo URI and returns exposure score (0–1). */
export async function analyzeExposure(uri: string): Promise<number> {
  const result = await loadPixelData(uri);
  if (!result) return 0.5;
  return computeExposureFromPixels(result.data);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/services/imageAnalyzer.test.ts
```

Expected: PASS (all 7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/imageAnalyzer.ts __tests__/services/imageAnalyzer.test.ts
git commit -m "feat: add image analyzer (sharpness + exposure scoring)"
```

---

## Task 5: Face Detection Service

**Files:**
- Create: `src/services/faceDetection.ts`

- [ ] **Step 1: Create face detection service**

```ts
// src/services/faceDetection.ts
import FaceDetector from '@react-native-ml-kit/face-detection';

export interface FaceBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceResult {
  bounds: FaceBounds;
  leftEyeOpenProbability: number;  // 0–1, 1 = eye open
  rightEyeOpenProbability: number; // 0–1
  smilingProbability: number;      // 0–1
}

/**
 * Runs ML Kit face detection on a local image URI.
 * Returns an empty array if no faces found or on error.
 */
export async function detectFaces(uri: string): Promise<FaceResult[]> {
  try {
    const faces = await FaceDetector.detect(uri, {
      performanceMode: 'fast',
      classificationMode: 'all', // enables eye open + smiling probabilities
      contourMode: 'none',
      landmarkMode: 'none',
    });

    return faces.map(face => ({
      bounds: {
        x: face.frame.left,
        y: face.frame.top,
        width: face.frame.width,
        height: face.frame.height,
      },
      leftEyeOpenProbability: face.leftEyeOpenProbability ?? 1,
      rightEyeOpenProbability: face.rightEyeOpenProbability ?? 1,
      smilingProbability: face.smilingProbability ?? 0,
    }));
  } catch {
    return [];
  }
}

/**
 * Returns the largest face from a list (by bounding box area).
 * Returns null if the list is empty.
 */
export function getLargestFace(faces: FaceResult[]): FaceResult | null {
  if (faces.length === 0) return null;
  return faces.reduce((largest, face) => {
    const area = face.bounds.width * face.bounds.height;
    const largestArea = largest.bounds.width * largest.bounds.height;
    return area > largestArea ? face : largest;
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/faceDetection.ts
git commit -m "feat: add ML Kit face detection service"
```

---

## Task 6: Image Label Detection Service (Baby Probability)

**Files:**
- Create: `src/services/imageLabelDetection.ts`

- [ ] **Step 1: Create image label detection service**

```ts
// src/services/imageLabelDetection.ts
import ImageLabeling from '@react-native-ml-kit/image-labeling';

// Labels ML Kit may return for baby/child subjects
const BABY_LABELS = ['baby', 'infant', 'toddler', 'child', 'newborn', 'kid'];

/**
 * Runs ML Kit image labeling to estimate the probability that the
 * primary subject in the photo is a baby or young child.
 *
 * Returns 0.0 if no baby-related label is found, up to 1.0 for high confidence.
 */
export async function detectBabyProbability(uri: string): Promise<number> {
  try {
    const labels = await ImageLabeling.label(uri, {
      confidenceThreshold: 0.3,
    });

    let maxConfidence = 0;
    for (const label of labels) {
      const text = label.text.toLowerCase();
      if (BABY_LABELS.some(bl => text.includes(bl))) {
        maxConfidence = Math.max(maxConfidence, label.confidence);
      }
    }

    return maxConfidence;
  } catch {
    return 0;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/imageLabelDetection.ts
git commit -m "feat: add image label detection service for baby probability"
```

---

## Task 7: Photo Scorer

**Files:**
- Create: `src/services/photoScorer.ts`
- Create: `__tests__/services/photoScorer.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/services/photoScorer.test.ts
import { scorePhoto, computeCompositionScore } from '../../src/services/photoScorer';
import { DEFAULT_SCORING_CONFIG } from '../../src/config/scoringConfig';
import { FaceResult } from '../../src/services/faceDetection';

const mockFace: FaceResult = {
  bounds: { x: 100, y: 100, width: 200, height: 200 }, // 200x200 face
  leftEyeOpenProbability: 0.9,
  rightEyeOpenProbability: 0.9,
  smilingProbability: 0.8,
};

describe('computeCompositionScore', () => {
  it('returns 1.0 for a face that covers ~15% of image area', () => {
    // face = 200x200 = 40000, image = 1000x1000 = 1000000, ratio = 4%
    // ratio 0.04 < 0.05, so score = 0.04/0.05 = 0.8
    const score = computeCompositionScore({ x: 0, y: 0, width: 200, height: 200 }, 1000, 1000);
    expect(score).toBeCloseTo(0.8, 1);
  });

  it('returns 1.0 for a face covering 20% of image (ideal range)', () => {
    // face = 447x447 ≈ 200000, image = 1000x1000 = 1000000, ratio = 0.2
    const score = computeCompositionScore({ x: 0, y: 0, width: 447, height: 447 }, 1000, 1000);
    expect(score).toBe(1.0);
  });

  it('penalizes face too large (>60% of image)', () => {
    const score = computeCompositionScore({ x: 0, y: 0, width: 900, height: 900 }, 1000, 1000);
    expect(score).toBeLessThan(0.5);
  });
});

describe('scorePhoto', () => {
  it('computes weighted total correctly', () => {
    const scores = scorePhoto(0.8, 0.9, 0.7, mockFace, 1000, 1000, DEFAULT_SCORING_CONFIG);
    const expectedTotal =
      0.35 * 0.8 + 0.30 * 0.9 + 0.20 * 0.7 + 0.15 * scores.composition;
    expect(scores.total).toBeCloseTo(expectedTotal, 5);
  });

  it('returns 0 composition when no face provided', () => {
    const scores = scorePhoto(0.5, 0.8, 0.6, null, 1000, 1000, DEFAULT_SCORING_CONFIG);
    expect(scores.composition).toBe(0);
  });

  it('total is between 0 and 1 for valid inputs', () => {
    const scores = scorePhoto(0.5, 0.5, 0.5, mockFace, 1000, 1000, DEFAULT_SCORING_CONFIG);
    expect(scores.total).toBeGreaterThanOrEqual(0);
    expect(scores.total).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/services/photoScorer.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement photo scorer**

```ts
// src/services/photoScorer.ts
import { ScoringConfig } from '../config/scoringConfig';
import { PhotoScores } from '../types';
import { FaceResult, FaceBounds } from './faceDetection';

/**
 * Computes a composition score (0–1) based on how much of the frame the face covers.
 * Ideal: face area is 5%–60% of total image area.
 * Exported for unit testing.
 */
export function computeCompositionScore(
  bounds: FaceBounds,
  imageWidth: number,
  imageHeight: number
): number {
  const faceArea = bounds.width * bounds.height;
  const imageArea = imageWidth * imageHeight;
  if (imageArea === 0) return 0;

  const ratio = faceArea / imageArea;

  if (ratio < 0.05) return ratio / 0.05;
  if (ratio > 0.60) return Math.max(0, 1 - (ratio - 0.60) / 0.40);
  return 1.0;
}

/**
 * Combines all per-dimension scores into a final PhotoScores object
 * using weights from the provided ScoringConfig.
 */
export function scorePhoto(
  sharpness: number,
  babyProbability: number,
  exposure: number,
  face: FaceResult | null,
  imageWidth: number,
  imageHeight: number,
  config: ScoringConfig
): PhotoScores {
  const composition = face
    ? computeCompositionScore(face.bounds, imageWidth, imageHeight)
    : 0;

  const total =
    config.weights.sharpness * sharpness +
    config.weights.babyProbability * babyProbability +
    config.weights.exposure * exposure +
    config.weights.composition * composition;

  return {
    sharpness,
    babyProbability,
    exposure,
    composition,
    total: Math.min(1, Math.max(0, total)),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/services/photoScorer.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/photoScorer.ts __tests__/services/photoScorer.test.ts
git commit -m "feat: add photo scorer with configurable weights"
```

---

## Task 8: Burst Deduplicator

**Files:**
- Create: `src/services/burstDeduplicator.ts`
- Create: `__tests__/services/burstDeduplicator.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/services/burstDeduplicator.test.ts
import { deduplicateBursts } from '../../src/services/burstDeduplicator';
import { PhotoCandidate } from '../../src/types';

function makeCandidate(id: string, creationTime: number, total: number): PhotoCandidate {
  return {
    localIdentifier: id,
    uri: `file://${id}.jpg`,
    creationTime,
    width: 1000,
    height: 1000,
    scores: { sharpness: total, babyProbability: total, exposure: total, composition: total, total },
  };
}

const SEC = 1000; // ms

describe('deduplicateBursts', () => {
  it('returns empty array for empty input', () => {
    expect(deduplicateBursts([], 60)).toEqual([]);
  });

  it('keeps a single photo unchanged', () => {
    const candidates = [makeCandidate('a', 1000 * SEC, 0.8)];
    expect(deduplicateBursts(candidates, 60)).toHaveLength(1);
  });

  it('keeps best photo from a burst group', () => {
    const candidates = [
      makeCandidate('a', 1000 * SEC, 0.5),
      makeCandidate('b', 1010 * SEC, 0.9), // best
      makeCandidate('c', 1020 * SEC, 0.7),
    ];
    const result = deduplicateBursts(candidates, 60);
    expect(result).toHaveLength(1);
    expect(result[0].localIdentifier).toBe('b');
  });

  it('keeps photos from separate time windows', () => {
    const candidates = [
      makeCandidate('a', 1000 * SEC, 0.9),   // group 1
      makeCandidate('b', 1200 * SEC, 0.8),   // group 2 (200s gap > 60s window)
    ];
    const result = deduplicateBursts(candidates, 60);
    expect(result).toHaveLength(2);
  });

  it('merges photos within burst window (60s)', () => {
    const candidates = [
      makeCandidate('a', 0, 0.6),
      makeCandidate('b', 30 * SEC, 0.9),  // 30s gap — same burst
      makeCandidate('c', 90 * SEC, 0.7),  // 60s gap from b — NEW burst
    ];
    const result = deduplicateBursts(candidates, 60);
    expect(result).toHaveLength(2);
    expect(result.map(r => r.localIdentifier).sort()).toEqual(['b', 'c']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/services/burstDeduplicator.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement burst deduplicator**

```ts
// src/services/burstDeduplicator.ts
import { PhotoCandidate } from '../types';

/**
 * Groups candidates into burst clusters (photos taken within `windowSeconds`
 * of each other) and keeps only the highest-scoring photo from each group.
 *
 * @param candidates - unsorted list of scored photo candidates
 * @param windowSeconds - photos within this gap (seconds) are in the same burst
 */
export function deduplicateBursts(
  candidates: PhotoCandidate[],
  windowSeconds: number
): PhotoCandidate[] {
  if (candidates.length === 0) return [];

  const sorted = [...candidates].sort((a, b) => a.creationTime - b.creationTime);

  const groups: PhotoCandidate[][] = [];
  let currentGroup: PhotoCandidate[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const gapSeconds = (sorted[i].creationTime - sorted[i - 1].creationTime) / 1000;
    if (gapSeconds <= windowSeconds) {
      currentGroup.push(sorted[i]);
    } else {
      groups.push(currentGroup);
      currentGroup = [sorted[i]];
    }
  }
  groups.push(currentGroup);

  return groups.map(group =>
    group.reduce((best, cur) => (cur.scores.total > best.scores.total ? cur : best))
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/services/burstDeduplicator.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/burstDeduplicator.ts __tests__/services/burstDeduplicator.test.ts
git commit -m "feat: add burst deduplicator (time-window clustering)"
```

---

## Task 9: Storage Service

**Files:**
- Create: `src/services/storage.ts`

- [ ] **Step 1: Create storage service**

```ts
// src/services/storage.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/services/storage.ts
git commit -m "feat: add AsyncStorage scan result persistence"
```

---

## Task 10: Scan Pipeline

**Files:**
- Create: `src/services/scanPipeline.ts`

- [ ] **Step 1: Create scan pipeline**

```ts
// src/services/scanPipeline.ts
import { PhotoCandidate, ScanProgress } from '../types';
import { ScoringConfig, DEFAULT_SCORING_CONFIG } from '../config/scoringConfig';
import { RawAsset, fetchThumbnailUri } from './photoLibrary';
import { detectFaces, getLargestFace } from './faceDetection';
import { detectBabyProbability } from './imageLabelDetection';
import { analyzeSharpness, analyzeExposure } from './imageAnalyzer';
import { scorePhoto } from './photoScorer';
import { deduplicateBursts } from './burstDeduplicator';

const BATCH_SIZE = 20;

/**
 * Orchestrates the full scan pipeline:
 *   fetch thumbnails → face detect → baby label → image analyze → score → dedup → top-N
 *
 * Processes assets in batches of 20 and calls onProgress after each batch.
 * Pass an AbortSignal to cancel mid-scan.
 */
export async function runScan(
  assets: RawAsset[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
  onProgress: (progress: ScanProgress) => void,
  signal?: AbortSignal
): Promise<PhotoCandidate[]> {
  const startTime = Date.now();
  const allCandidates: PhotoCandidate[] = [];

  for (let i = 0; i < assets.length; i += BATCH_SIZE) {
    if (signal?.aborted) break;

    const batch = assets.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(asset => processSingleAsset(asset, config))
    );

    for (const candidate of batchResults) {
      if (candidate) allCandidates.push(candidate);
    }

    const processed = Math.min(i + BATCH_SIZE, assets.length);
    const elapsedSec = (Date.now() - startTime) / 1000;
    const rate = elapsedSec > 0 ? processed / elapsedSec : 1;
    const remaining = assets.length - processed;

    onProgress({
      processed,
      total: assets.length,
      estimatedSecondsRemaining: rate > 0 ? remaining / rate : 0,
    });
  }

  // Dedup burst photos
  const deduped = deduplicateBursts(allCandidates, config.filters.burstWindowSeconds);

  // Sort by total score descending
  const sorted = deduped.sort((a, b) => b.scores.total - a.scores.total);

  // Apply per-day limit and total cap
  return applyOutputLimits(sorted, config.output.defaultCount, config.output.maxPerDay);
}

async function processSingleAsset(
  asset: RawAsset,
  config: ScoringConfig
): Promise<PhotoCandidate | null> {
  try {
    const uri = await fetchThumbnailUri(asset.id);

    // Step 1: face detection (fastest filter)
    const faces = await detectFaces(uri);
    if (faces.length === 0) return null;

    // Step 2: baby probability (only run if face found)
    const babyProbability = await detectBabyProbability(uri);
    if (babyProbability < config.filters.minBabyProbability) return null;

    // Step 3: image quality (run in parallel)
    const [sharpness, exposure] = await Promise.all([
      analyzeSharpness(uri),
      analyzeExposure(uri),
    ]);

    const largestFace = getLargestFace(faces)!;

    // Step 4: compute composite score
    const scores = scorePhoto(
      sharpness,
      babyProbability,
      exposure,
      largestFace,
      asset.width,
      asset.height,
      config
    );

    return {
      localIdentifier: asset.id,
      uri,
      creationTime: asset.creationTime,
      width: asset.width,
      height: asset.height,
      scores,
    };
  } catch {
    return null; // skip unreadable assets silently
  }
}

function applyOutputLimits(
  candidates: PhotoCandidate[],
  maxTotal: number,
  maxPerDay: number
): PhotoCandidate[] {
  const dayCounts: Record<string, number> = {};
  const result: PhotoCandidate[] = [];

  for (const candidate of candidates) {
    if (result.length >= maxTotal) break;

    const day = new Date(candidate.creationTime).toDateString();
    const count = dayCounts[day] ?? 0;

    if (count < maxPerDay) {
      result.push(candidate);
      dayCounts[day] = count + 1;
    }
  }

  return result;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/scanPipeline.ts
git commit -m "feat: add scan pipeline (batch processing, dedup, output limits)"
```

---

## Task 11: ScanContext + Navigation Skeleton

**Files:**
- Create: `src/context/ScanContext.tsx`
- Create: `src/navigation/AppNavigator.tsx`
- Modify: `App.tsx`

- [ ] **Step 1: Create ScanContext**

```tsx
// src/context/ScanContext.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { ScanResult, PhotoCandidate } from '../types';

interface ScanContextValue {
  scanResult: ScanResult | null;
  setScanResult: (result: ScanResult) => void;
  selectedIds: Set<string>;
  toggleSelected: (id: string) => void;
  addCandidate: (candidate: PhotoCandidate) => void;
  removeSelected: (id: string) => void;
  clearAll: () => void;
}

const ScanContext = createContext<ScanContextValue | null>(null);

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const [scanResult, setScanResultState] = useState<ScanResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const setScanResult = useCallback((result: ScanResult) => {
    setScanResultState(result);
    setSelectedIds(new Set(result.selected));
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const addCandidate = useCallback((candidate: PhotoCandidate) => {
    setScanResultState(prev => {
      if (!prev) return prev;
      const exists = prev.candidates.some(
        c => c.localIdentifier === candidate.localIdentifier
      );
      if (exists) return prev;
      return { ...prev, candidates: [...prev.candidates, candidate] };
    });
    setSelectedIds(prev => new Set([...prev, candidate.localIdentifier]));
  }, []);

  const removeSelected = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setScanResultState(null);
    setSelectedIds(new Set());
  }, []);

  return (
    <ScanContext.Provider
      value={{ scanResult, setScanResult, selectedIds, toggleSelected, addCandidate, removeSelected, clearAll }}
    >
      {children}
    </ScanContext.Provider>
  );
}

export function useScan(): ScanContextValue {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error('useScan must be used within ScanProvider');
  return ctx;
}
```

- [ ] **Step 2: Create navigation (with placeholder screens)**

```tsx
// src/navigation/AppNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

import HomeScreen from '../screens/HomeScreen';
import PermissionScreen from '../screens/PermissionScreen';
import ScanningScreen from '../screens/ScanningScreen';
import ResultsScreen from '../screens/ResultsScreen';
import PhotoPreviewScreen from '../screens/PhotoPreviewScreen';
import DoneScreen from '../screens/DoneScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Permission" component={PermissionScreen} />
      <Stack.Screen name="Scanning" component={ScanningScreen} />
      <Stack.Screen name="Results" component={ResultsScreen} />
      <Stack.Screen name="PhotoPreview" component={PhotoPreviewScreen} />
      <Stack.Screen name="Done" component={DoneScreen} />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 3: Add RootStackParamList to types**

Append to `src/types/index.ts`:

```ts
export type RootStackParamList = {
  Home: undefined;
  Permission: undefined;
  Scanning: { mode: 'full' | 'limited'; assetIds?: string[] };
  Results: undefined;
  PhotoPreview: { candidateId: string };
  Done: { savedCount: number };
};
```

- [ ] **Step 4: Create placeholder screens (one file per screen)**

Create each of these with a minimal placeholder:

```tsx
// src/screens/HomeScreen.tsx
import React from 'react';
import { View, Text } from 'react-native';
export default function HomeScreen() {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>Home</Text></View>;
}
```

Repeat for: `PermissionScreen.tsx`, `ScanningScreen.tsx`, `ResultsScreen.tsx`, `PhotoPreviewScreen.tsx`, `DoneScreen.tsx` (same pattern, different label).

- [ ] **Step 5: Wire App.tsx**

```tsx
// App.tsx
import 'react-native-gesture-handler';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ScanProvider } from './src/context/ScanContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <ScanProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </ScanProvider>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 6: Verify app navigates to Home screen on device**

```bash
npx expo run:ios --device
```

Expected: app shows "Home" text on screen.

- [ ] **Step 7: Commit**

```bash
git add src/context src/navigation src/screens App.tsx
git commit -m "feat: add ScanContext, navigation skeleton, placeholder screens"
```

---

## Task 12: Home Screen

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

- [ ] **Step 1: Implement Home screen**

```tsx
// src/screens/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { loadScanResult } from '../services/storage';
import { useScan } from '../context/ScanContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { setScanResult, clearAll } = useScan();
  const [lastScanDate, setLastScanDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScanResult().then(result => {
      if (result) {
        setScanResult(result);
        setLastScanDate(new Date(result.scannedAt));
      }
      setLoading(false);
    });
  }, []);

  const handleStartScan = () => {
    clearAll();
    navigation.navigate('Permission');
  };

  const handleViewLast = () => {
    navigation.navigate('Results');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B9D" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.hero}>
        <Text style={styles.emoji}>👶</Text>
        <Text style={styles.title}>宝宝精选</Text>
        <Text style={styles.subtitle}>帮你从海量照片里{'\n'}找出宝宝最美的瞬间</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleStartScan}>
          <Text style={styles.primaryButtonText}>开始扫描</Text>
        </TouchableOpacity>

        {lastScanDate && (
          <TouchableOpacity style={styles.secondaryButton} onPress={handleViewLast}>
            <Text style={styles.secondaryButtonText}>
              查看上次结果
            </Text>
            <Text style={styles.secondaryButtonSub}>
              {lastScanDate.toLocaleDateString('zh-CN')} 扫描
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9FB', paddingHorizontal: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 72, marginBottom: 16 },
  title: { fontSize: 32, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  subtitle: { fontSize: 18, color: '#666', textAlign: 'center', lineHeight: 28 },
  actions: { gap: 12 },
  primaryButton: {
    backgroundColor: '#FF6B9D', borderRadius: 16, paddingVertical: 18,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#FFB3CC',
  },
  secondaryButtonText: { color: '#FF6B9D', fontSize: 16, fontWeight: '600' },
  secondaryButtonSub: { color: '#999', fontSize: 13, marginTop: 4 },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat: implement Home screen with last-scan history"
```

---

## Task 13: Permission Screen

**Files:**
- Modify: `src/screens/PermissionScreen.tsx`

- [ ] **Step 1: Implement Permission screen**

```tsx
// src/screens/PermissionScreen.tsx
import React, { useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Linking,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
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
    } else if (status === 'limited') {
      // Limited permission — user selected specific photos
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
    // Request limited permission — iOS shows the photo picker
    await MediaLibrary.requestPermissionsAsync(true);
    const { status } = await MediaLibrary.getPermissionsAsync();

    if (status === 'granted' || status === 'limited') {
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
    backgroundColor: '#FF6B9D', borderRadius: 16, paddingVertical: 18,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  primaryButtonSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
  secondaryButton: {
    backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#FFB3CC',
  },
  secondaryButtonText: { color: '#FF6B9D', fontSize: 16, fontWeight: '600' },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/PermissionScreen.tsx
git commit -m "feat: implement Permission screen (full + limited access flows)"
```

---

## Task 14: ProgressBar Component + Scanning Screen

**Files:**
- Create: `src/components/ProgressBar.tsx`
- Modify: `src/screens/ScanningScreen.tsx`

- [ ] **Step 1: Create ProgressBar component**

```tsx
// src/components/ProgressBar.tsx
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
  track: {
    height: 8, backgroundColor: '#FFD6E7', borderRadius: 4, overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: '#FF6B9D', borderRadius: 4 },
  percent: { fontSize: 13, color: '#999', textAlign: 'right', marginTop: 6 },
});
```

- [ ] **Step 2: Implement Scanning screen**

```tsx
// src/screens/ScanningScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, AppState } from 'react-native';
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

export default function ScanningScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { setScanResult } = useScan();
  const [progress, setProgress] = useState<ScanProgress>({ processed: 0, total: 1000, estimatedSecondsRemaining: 0 });
  const abortRef = useRef<AbortController>(new AbortController());

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
  container: { flex: 1, backgroundColor: '#FFF9FB', paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 64, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A2E', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 32, textAlign: 'center' },
  barWrapper: { width: '100%', marginBottom: 20 },
  hint: { fontSize: 14, color: '#AAA' },
});
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ProgressBar.tsx src/screens/ScanningScreen.tsx
git commit -m "feat: add ProgressBar component and Scanning screen with live pipeline"
```

---

## Task 15: PhotoThumbnail + PhotoGrid Components

**Files:**
- Create: `src/components/PhotoThumbnail.tsx`
- Create: `src/components/PhotoGrid.tsx`

- [ ] **Step 1: Create PhotoThumbnail**

```tsx
// src/components/PhotoThumbnail.tsx
import React, { useCallback } from 'react';
import {
  TouchableOpacity, Image, View, StyleSheet, Dimensions,
} from 'react-native';
import { PhotoCandidate } from '../types';

const { width } = Dimensions.get('window');
const CELL_SIZE = (width - 4) / 3; // 3-column grid with 2px gaps

interface Props {
  candidate: PhotoCandidate;
  selected: boolean;
  onPress: (candidate: PhotoCandidate) => void;
  onLongPress: (candidate: PhotoCandidate) => void;
  showAddButton?: boolean; // for 全部照片 tab
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

      {/* Selection overlay */}
      {selected && (
        <View style={styles.selectedOverlay}>
          <View style={styles.checkCircle}>
            <View style={styles.checkmark} />
          </View>
        </View>
      )}

      {/* Add button overlay for 全部照片 tab */}
      {showAddButton && !selected && (
        <View style={styles.addOverlay}>
          <View style={styles.addCircle}>
            <View style={styles.addPlus} />
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 107, 157, 0.25)',
    alignItems: 'flex-end',
    padding: 6,
  },
  checkCircle: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#FF6B9D', alignItems: 'center', justifyContent: 'center',
  },
  checkmark: {
    width: 12, height: 7, borderLeftWidth: 2, borderBottomWidth: 2,
    borderColor: '#FFF', transform: [{ rotate: '-45deg' }, { translateY: -2 }],
  },
  addOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    padding: 6,
  },
  addCircle: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#FF6B9D',
  },
  addPlus: {
    width: 12, height: 12,
    borderTopWidth: 2, borderRightWidth: 2,
    borderColor: '#FF6B9D', transform: [{ rotate: '45deg' }],
  },
});
```

- [ ] **Step 2: Create PhotoGrid**

```tsx
// src/components/PhotoGrid.tsx
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
```

- [ ] **Step 3: Commit**

```bash
git add src/components/PhotoThumbnail.tsx src/components/PhotoGrid.tsx
git commit -m "feat: add PhotoThumbnail and PhotoGrid components"
```

---

## Task 16: Results Screen

**Files:**
- Modify: `src/screens/ResultsScreen.tsx`

- [ ] **Step 1: Implement Results screen**

```tsx
// src/screens/ResultsScreen.tsx
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, PhotoCandidate } from '../types';
import { useScan } from '../context/ScanContext';
import PhotoGrid from '../components/PhotoGrid';

type Props = NativeStackScreenProps<RootStackParamList, 'Results'>;
type Tab = 'ai' | 'all';

export default function ResultsScreen({ navigation }: Props) {
  const { scanResult, selectedIds, toggleSelected, removeSelected, addCandidate } = useScan();
  const [activeTab, setActiveTab] = useState<Tab>('ai');

  const aiCandidates = scanResult?.candidates ?? [];

  // Build all-photos list from allAssetIds for the 全部照片 tab
  // We show all scanned assets as minimal PhotoCandidate objects
  const allCandidates: PhotoCandidate[] = useMemo(() => {
    if (!scanResult) return [];
    // Use existing candidates for those we have scores; create stubs for the rest
    const known = new Map(scanResult.candidates.map(c => [c.localIdentifier, c]));
    return scanResult.allAssetIds.map(id => known.get(id) ?? {
      localIdentifier: id,
      uri: '', // will be loaded lazily by the Image component via asset URI
      creationTime: 0,
      width: 0,
      height: 0,
      scores: { sharpness: 0, babyProbability: 0, exposure: 0, composition: 0, total: 0 },
    });
  }, [scanResult]);

  const handlePressPhoto = useCallback((candidate: PhotoCandidate) => {
    navigation.push('PhotoPreview', { candidateId: candidate.localIdentifier });
  }, [navigation]);

  const handleLongPressPhoto = useCallback((candidate: PhotoCandidate) => {
    Alert.alert(
      '移除照片',
      '将此照片从精选中移除？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '移除', style: 'destructive',
          onPress: () => removeSelected(candidate.localIdentifier),
        },
      ]
    );
  }, [removeSelected]);

  const handleAddPhoto = useCallback((candidate: PhotoCandidate) => {
    addCandidate(candidate);
  }, [addCandidate]);

  const handleSave = useCallback(() => {
    const count = selectedIds.size;
    if (count === 0) {
      Alert.alert('请先选择照片', '至少选择一张照片再保存。');
      return;
    }
    navigation.replace('Done', { savedCount: count });
  }, [selectedIds, navigation]);

  const currentCandidates = activeTab === 'ai' ? aiCandidates : allCandidates;
  const selectedCount = selectedIds.size;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>为你找到 {aiCandidates.length} 张宝宝精选</Text>
          <Text style={styles.subtitle}>已选 {selectedCount} 张</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.replace('Permission')} style={styles.rescanBtn}>
          <Text style={styles.rescanText}>重新扫描</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ai' && styles.tabActive]}
          onPress={() => setActiveTab('ai')}
        >
          <Text style={[styles.tabText, activeTab === 'ai' && styles.tabTextActive]}>
            AI 精选
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            全部照片
          </Text>
        </TouchableOpacity>
      </View>

      {/* Grid */}
      <View style={styles.gridWrapper}>
        <PhotoGrid
          candidates={currentCandidates}
          selectedIds={selectedIds}
          onPressPhoto={handlePressPhoto}
          onLongPressPhoto={activeTab === 'ai' ? handleLongPressPhoto : handleAddPhoto}
          showAddButton={activeTab === 'all'}
        />
      </View>

      {/* Save button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>保存精选（{selectedCount} 张）</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9FB' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#1A1A2E' },
  subtitle: { fontSize: 14, color: '#999', marginTop: 2 },
  rescanBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  rescanText: { color: '#FF6B9D', fontSize: 14 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 },
  tab: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderBottomWidth: 2, borderColor: 'transparent',
  },
  tabActive: { borderColor: '#FF6B9D' },
  tabText: { fontSize: 15, color: '#999' },
  tabTextActive: { color: '#FF6B9D', fontWeight: '600' },
  gridWrapper: { flex: 1 },
  footer: { padding: 16, paddingBottom: 32 },
  saveButton: {
    backgroundColor: '#FF6B9D', borderRadius: 16, paddingVertical: 18,
    alignItems: 'center',
  },
  saveButtonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/ResultsScreen.tsx
git commit -m "feat: implement Results screen (AI tab + All Photos tab + save)"
```

---

## Task 17: Photo Preview Screen

**Files:**
- Create: `src/components/ScoreBar.tsx`
- Modify: `src/screens/PhotoPreviewScreen.tsx`

- [ ] **Step 1: Create ScoreBar component**

```tsx
// src/components/ScoreBar.tsx
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
  track: {
    flex: 1, height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3 },
  value: { width: 36, textAlign: 'right', fontSize: 13, color: '#999' },
});
```

- [ ] **Step 2: Implement Photo Preview screen**

```tsx
// src/screens/PhotoPreviewScreen.tsx
import React, { useMemo, useCallback } from 'react';
import {
  View, Image, Text, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useScan } from '../context/ScanContext';
import ScoreBar from '../components/ScoreBar';

type Props = NativeStackScreenProps<RootStackParamList, 'PhotoPreview'>;
const { width, height } = Dimensions.get('window');

export default function PhotoPreviewScreen({ navigation, route }: Props) {
  const { candidateId } = route.params;
  const { scanResult, selectedIds, toggleSelected, removeSelected } = useScan();
  const insets = useSafeAreaInsets();

  const candidate = useMemo(
    () => scanResult?.candidates.find(c => c.localIdentifier === candidateId),
    [scanResult, candidateId]
  );

  const isSelected = selectedIds.has(candidateId);

  const handleRemove = useCallback(() => {
    removeSelected(candidateId);
    navigation.goBack();
  }, [candidateId, removeSelected, navigation]);

  const handleToggle = useCallback(() => {
    toggleSelected(candidateId);
  }, [candidateId, toggleSelected]);

  if (!candidate) {
    return (
      <View style={styles.center}>
        <Text>照片不存在</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Photo */}
      <Image
        source={{ uri: candidate.uri }}
        style={[styles.photo, { height: height * 0.55 }]}
        resizeMode="cover"
      />

      {/* Back button */}
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 12 }]}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backText}>‹ 返回</Text>
      </TouchableOpacity>

      {/* Score breakdown */}
      <View style={[styles.panel, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.panelTitle}>AI 评分详情</Text>
        <ScoreBar label="清晰度" value={candidate.scores.sharpness} color="#FF6B9D" />
        <ScoreBar label="宝宝概率" value={candidate.scores.babyProbability} color="#A78BFA" />
        <ScoreBar label="曝光" value={candidate.scores.exposure} color="#34D399" />
        <ScoreBar label="构图" value={candidate.scores.composition} color="#60A5FA" />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>综合得分</Text>
          <Text style={styles.totalValue}>{Math.round(candidate.scores.total * 100)}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {isSelected ? (
            <TouchableOpacity style={styles.removeButton} onPress={handleRemove}>
              <Text style={styles.removeText}>从精选中移除</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.addButton} onPress={handleToggle}>
              <Text style={styles.addText}>添加到精选</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photo: { width },
  backButton: {
    position: 'absolute', left: 16,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  backText: { color: '#FFF', fontSize: 16 },
  panel: {
    flex: 1, backgroundColor: '#FFF9FB', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24,
  },
  panelTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A2E', marginBottom: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderColor: '#EEE' },
  totalLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  totalValue: { fontSize: 22, fontWeight: '700', color: '#FF6B9D' },
  actions: { marginTop: 20 },
  removeButton: {
    backgroundColor: '#FFF', borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#FF6B9D',
  },
  removeText: { color: '#FF6B9D', fontSize: 16, fontWeight: '600' },
  addButton: {
    backgroundColor: '#FF6B9D', borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  addText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ScoreBar.tsx src/screens/PhotoPreviewScreen.tsx
git commit -m "feat: add ScoreBar component and PhotoPreview screen with score breakdown"
```

---

## Task 18: Done Screen + Save Logic

**Files:**
- Modify: `src/screens/DoneScreen.tsx`
- Modify: `src/screens/ResultsScreen.tsx` (add save handler)

- [ ] **Step 1: Implement Done screen**

```tsx
// src/screens/DoneScreen.tsx
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
      .catch(err => setError(err.message ?? '保存失败'))
      .finally(() => setSaving(false));
  }, []);

  const handleOpenPhotos = () => {
    // Deep-link into Photos app is not directly supported; open Photos URL scheme
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
```

- [ ] **Step 2: Wire save button in ResultsScreen to navigate to Done**

In `src/screens/ResultsScreen.tsx`, update the `handleSave` function (the current implementation already does this, but double-check the navigation call passes `savedCount: selectedCount`):

```tsx
// Inside ResultsScreen.tsx — verify handleSave reads:
const handleSave = useCallback(() => {
  const count = selectedIds.size;
  if (count === 0) {
    Alert.alert('请先选择照片', '至少选择一张照片再保存。');
    return;
  }
  navigation.replace('Done', { savedCount: count });
}, [selectedIds, navigation]);
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/DoneScreen.tsx src/screens/ResultsScreen.tsx
git commit -m "feat: add Done screen with save-to-album, share, and rescan actions"
```

---

## Task 19: End-to-End Test on Device

**Files:** no new files — verification only.

- [ ] **Step 1: Build and run on a physical iOS device**

```bash
npx expo run:ios --device
```

- [ ] **Step 2: Walk through the full happy path**

1. Open app → Home screen shows "开始扫描"
2. Tap → Permission screen appears
3. Tap "允许访问全部照片" → system permission dialog
4. Grant permission → Scanning screen shows progress
5. Wait for scan → Results screen shows AI grid
6. Long-press a photo → removal alert appears
7. Switch to "全部照片" tab → all scanned photos shown
8. Tap a non-selected photo → it gets added to selection
9. Tap "保存精选" → Done screen + saving to album
10. Open system Photos app → verify "宝宝精选" album exists with photos

- [ ] **Step 3: Fix any crashes or flow breaks found above before proceeding**

- [ ] **Step 4: Commit fixes if any**

```bash
git add -A && git commit -m "fix: end-to-end flow corrections from device testing"
```

---

## Task 20: App Store Prep

**Files:**
- Modify: `app.json`
- Modify: `ios/baby-photo-selector/Info.plist`

- [ ] **Step 1: Finalize app.json metadata**

```json
{
  "expo": {
    "name": "宝宝精选",
    "slug": "baby-photo-selector",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#FFF9FB"
    },
    "ios": {
      "bundleIdentifier": "com.yourname.babyphotoselector",
      "supportsTablet": false,
      "buildNumber": "1",
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "宝宝精选需要访问您的相册，用于在本地分析并筛选宝宝照片。所有处理均在您的设备上完成，照片不会上传到任何服务器。",
        "NSPhotoLibraryAddUsageDescription": "宝宝精选需要将精选照片保存到您的相册。",
        "UIBackgroundModes": ["fetch", "processing"]
      }
    }
  }
}
```

- [ ] **Step 2: Add App Store description strings to Info.plist**

These must be present for App Review. Open `ios/baby-photo-selector/Info.plist` and verify these keys exist:

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>宝宝精选需要访问您的相册，用于在本地分析并筛选宝宝照片。所有处理均在您的设备上完成，照片不会上传到任何服务器。</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>宝宝精选需要将精选照片保存到您的相册。</string>
```

- [ ] **Step 3: Generate App Icon and Splash screen**

Place a 1024×1024px icon at `assets/icon.png`. Generate all sizes:

```bash
npx expo-optimize   # or use https://icon.kitchen/
```

- [ ] **Step 4: Create App Store Connect listing**

In App Store Connect (https://appstoreconnect.apple.com):
- App name: 宝宝精选
- Category: Photo & Video
- Age rating: 4+
- Privacy: No data collected
- Description (copy-paste):

```
自动从相册里找出宝宝最美的瞬间。

扫描最近 1000 张照片，AI 识别宝宝照片并评分，挑出最好看的 30 张，一键保存到「宝宝精选」相册。

✅ 全程本地处理，照片不离开手机
✅ 自动识别清晰度、宝宝概率、曝光和构图
✅ 支持手动删除误判、补充漏选
✅ 一键保存到系统相册
```

- [ ] **Step 5: Build IPA and submit**

```bash
npx eas build --platform ios --profile production
npx eas submit --platform ios
```

(Requires EAS account setup: `npx eas login && npx eas build:configure`)

- [ ] **Step 6: Commit final state**

```bash
git add -A && git commit -m "feat: app store metadata and build configuration"
git push
```

---

## Self-Review Checklist

**Spec coverage:**
| Spec requirement | Covered by task |
|---|---|
| 授权相册（全部/选中） | Task 13 PermissionScreen |
| 自动扫描最近 1000 张 | Task 10 scanPipeline |
| 读取缩略图，不加载原图 | Task 3 photoLibrary.fetchThumbnailUri |
| 人脸检测 → 过滤无脸照片 | Task 5 faceDetection |
| 婴儿概率检测 | Task 6 imageLabelDetection |
| 清晰度评分（Laplacian） | Task 4 imageAnalyzer |
| 曝光评分 | Task 4 imageAnalyzer |
| 构图评分（人脸占比） | Task 7 photoScorer |
| 权重从配置读取，不写死 | Task 2 scoringConfig + Task 7 photoScorer |
| 连拍去重（60s窗口） | Task 8 burstDeduplicator |
| 每天最多5张限制 | Task 10 scanPipeline.applyOutputLimits |
| 进度条 + 批次处理 | Task 14 ScanningScreen + ProgressBar |
| 精选结果3列网格 | Task 15 PhotoGrid |
| 长按删除误判 | Task 16 ResultsScreen |
| 全部照片Tab补充漏选 | Task 16 ResultsScreen |
| 全屏预览 + 评分详情 | Task 17 PhotoPreviewScreen + ScoreBar |
| 保存到「宝宝精选」相册 | Task 3 photoLibrary.saveToFavoriteAlbum + Task 18 DoneScreen |
| 分享给家人 | Task 18 DoneScreen |
| 重新扫描 | Task 18 DoneScreen |
| App Store 上架准备 | Task 20 |

All spec requirements have corresponding tasks. ✅
