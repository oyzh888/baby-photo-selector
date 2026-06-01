export interface ScoringWeights {
  sharpness: number;
  babyProbability: number;
  exposure: number;
  composition: number;
}

export interface ScoringFilters {
  minBabyProbability: number;
  burstWindowSeconds: number;
}

export interface ScoringOutput {
  defaultCount: number;
  maxPerDay: number;
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
