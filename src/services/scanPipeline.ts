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
 * Processes assets in batches of 20. Calls onProgress after each batch.
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

  const deduped = deduplicateBursts(allCandidates, config.filters.burstWindowSeconds);
  const sorted = deduped.sort((a, b) => b.scores.total - a.scores.total);
  return applyOutputLimits(sorted, config.output.defaultCount, config.output.maxPerDay);
}

async function processSingleAsset(
  asset: RawAsset,
  config: ScoringConfig
): Promise<PhotoCandidate | null> {
  try {
    const uri = await fetchThumbnailUri(asset.id);

    const faces = await detectFaces(uri);
    if (faces.length === 0) return null;

    const babyProbability = await detectBabyProbability(uri);
    if (babyProbability < config.filters.minBabyProbability) return null;

    const [sharpness, exposure] = await Promise.all([
      analyzeSharpness(uri),
      analyzeExposure(uri),
    ]);

    const largestFace = getLargestFace(faces)!;

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
    return null;
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
