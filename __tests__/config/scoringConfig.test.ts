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
