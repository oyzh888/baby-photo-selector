import { deduplicateBursts } from '../../src/services/burstDeduplicator';
import { PhotoCandidate } from '../../src/types';

const SEC = 1000; // ms

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
      makeCandidate('b', 1010 * SEC, 0.9),
      makeCandidate('c', 1020 * SEC, 0.7),
    ];
    const result = deduplicateBursts(candidates, 60);
    expect(result).toHaveLength(1);
    expect(result[0].localIdentifier).toBe('b');
  });
  it('keeps photos from separate time windows', () => {
    const candidates = [
      makeCandidate('a', 1000 * SEC, 0.9),
      makeCandidate('b', 1200 * SEC, 0.8),
    ];
    const result = deduplicateBursts(candidates, 60);
    expect(result).toHaveLength(2);
  });
  it('merges photos within burst window (60s) and separates at boundary', () => {
    const candidates = [
      makeCandidate('a', 0, 0.6),
      makeCandidate('b', 30 * SEC, 0.9),   // 30s gap — same burst as 'a'
      makeCandidate('c', 90 * SEC, 0.7),   // 60s gap from 'b' — new burst
    ];
    const result = deduplicateBursts(candidates, 60);
    expect(result).toHaveLength(2);
    expect(result.map(r => r.localIdentifier).sort()).toEqual(['b', 'c']);
  });
});
