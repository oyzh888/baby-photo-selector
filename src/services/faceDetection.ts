import FaceDetector from '@react-native-ml-kit/face-detection';

export interface FaceBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceResult {
  bounds: FaceBounds;
  leftEyeOpenProbability: number;
  rightEyeOpenProbability: number;
  smilingProbability: number;
}

/**
 * Runs ML Kit face detection on a local image URI.
 * Returns an empty array if no faces found or on error.
 */
export async function detectFaces(uri: string): Promise<FaceResult[]> {
  try {
    const faces = await FaceDetector.detect(uri, {
      performanceMode: 'fast',
      classificationMode: 'all',
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
