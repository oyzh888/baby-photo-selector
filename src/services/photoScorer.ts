import { ScoringConfig } from '../config/scoringConfig';
import { PhotoScores } from '../types';
import { FaceResult, FaceBounds } from './faceDetection';

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
