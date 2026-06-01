import { scorePhoto, computeCompositionScore } from '../../src/services/photoScorer';
import { DEFAULT_SCORING_CONFIG } from '../../src/config/scoringConfig';
import { FaceResult } from '../../src/services/faceDetection';

const mockFace: FaceResult = {
  bounds: { x: 100, y: 100, width: 200, height: 200 },
  leftEyeOpenProbability: 0.9,
  rightEyeOpenProbability: 0.9,
  smilingProbability: 0.8,
};

describe('computeCompositionScore', () => {
  it('returns a score for face covering ~4% of image', () => {
    // face = 200x200 = 40000, image = 1000x1000 = 1000000, ratio = 0.04 < 0.05
    const score = computeCompositionScore({ x: 0, y: 0, width: 200, height: 200 }, 1000, 1000);
    expect(score).toBeCloseTo(0.8, 1);
  });
  it('returns 1.0 for face covering 20% of image (ideal range)', () => {
    // face = 447x447 ≈ 199809, image = 1000000, ratio ≈ 0.2
    const score = computeCompositionScore({ x: 0, y: 0, width: 447, height: 447 }, 1000, 1000);
    expect(score).toBe(1.0);
  });
  it('penalizes face covering >60% of image', () => {
    const score = computeCompositionScore({ x: 0, y: 0, width: 900, height: 900 }, 1000, 1000);
    expect(score).toBeLessThan(0.5);
  });
});

describe('scorePhoto', () => {
  it('computes weighted total correctly', () => {
    const scores = scorePhoto(0.8, 0.9, 0.7, mockFace, 1000, 1000, DEFAULT_SCORING_CONFIG);
    const expectedComposition = computeCompositionScore(mockFace.bounds, 1000, 1000);
    const expectedTotal =
      0.35 * 0.8 + 0.30 * 0.9 + 0.20 * 0.7 + 0.15 * expectedComposition;
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
