import { computeSharpnessFromPixels, computeExposureFromPixels } from '../../src/services/imageAnalyzer';

function solidColor(r: number, g: number, b: number, size = 4): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
  }
  return data;
}

function checkerboard(size = 50): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = (x + y) % 2 === 0 ? 255 : 0;
      const i = (y * size + x) * 4;
      data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
    }
  }
  return data;
}

describe('computeSharpnessFromPixels', () => {
  it('returns near 0 for a solid-color image (no edges = blurry)', () => {
    const pixels = solidColor(128, 128, 128);
    const score = computeSharpnessFromPixels(pixels, 4, 4);
    expect(score).toBeCloseTo(0, 1);
  });
  it('returns a high value for a high-contrast checkerboard (sharp)', () => {
    const pixels = checkerboard(50);
    const score = computeSharpnessFromPixels(pixels, 50, 50);
    expect(score).toBeGreaterThan(0.5);
  });
  it('returns a value between 0 and 1', () => {
    const pixels = checkerboard(50);
    const score = computeSharpnessFromPixels(pixels, 50, 50);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe('computeExposureFromPixels', () => {
  it('returns 1.0 for well-exposed (medium brightness)', () => {
    const pixels = solidColor(130, 130, 130);
    const score = computeExposureFromPixels(pixels);
    expect(score).toBe(1.0);
  });
  it('returns < 0.5 for very dark image', () => {
    const pixels = solidColor(10, 10, 10);
    const score = computeExposureFromPixels(pixels);
    expect(score).toBeLessThan(0.5);
  });
  it('returns < 0.5 for very bright (overexposed) image', () => {
    const pixels = solidColor(250, 250, 250);
    const score = computeExposureFromPixels(pixels);
    expect(score).toBeLessThan(0.5);
  });
  it('returns a value between 0 and 1', () => {
    const pixels = solidColor(200, 200, 200);
    const score = computeExposureFromPixels(pixels);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
