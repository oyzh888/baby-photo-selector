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
