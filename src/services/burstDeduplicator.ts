import { PhotoCandidate } from '../types';

/**
 * Groups candidates into burst clusters (photos taken within `windowSeconds`
 * of each other) and keeps only the highest-scoring photo from each group.
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
    if (gapSeconds < windowSeconds) {
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
