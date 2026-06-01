import * as ImageManipulator from 'expo-image-manipulator';
// @ts-ignore - fast-png doesn't have TypeScript definitions
import { decode as decodePng } from 'fast-png';

const ANALYSIS_SIZE = 50;

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
    return { data: png.data as Uint8Array, width: png.width, height: png.height };
  } catch {
    return null;
  }
}

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
  const variance = laplacianValues.reduce((a, b) => a + (b - mean) ** 2, 0) / laplacianValues.length;
  return Math.min(1, Math.max(0, (variance - 10) / 490));
}

export function computeExposureFromPixels(data: Uint8Array): number {
  let totalLuminance = 0;
  const pixelCount = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    totalLuminance += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  const mean = totalLuminance / pixelCount;
  if (mean < 80) return mean / 80;
  if (mean > 180) return Math.max(0, 1 - (mean - 180) / 75);
  return 1.0;
}

export async function analyzeSharpness(uri: string): Promise<number> {
  const result = await loadPixelData(uri);
  if (!result) return 0.5;
  return computeSharpnessFromPixels(result.data, result.width, result.height);
}

export async function analyzeExposure(uri: string): Promise<number> {
  const result = await loadPixelData(uri);
  if (!result) return 0.5;
  return computeExposureFromPixels(result.data);
}
