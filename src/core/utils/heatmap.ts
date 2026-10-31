type RGB = [number, number, number];

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function interpolateColor(color1: RGB, color2: RGB, t: number): string {
  const r = lerp(color1[0], color2[0], t);
  const g = lerp(color1[1], color2[1], t);
  const b = lerp(color1[2], color2[2], t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function getHeatmapColor(value: number, isDark = false): string {
  if (isDark) {
    const start: RGB = [38, 38, 38];
    const end: RGB = [22, 163, 74];
    return interpolateColor(start, end, value / 100);
  }
  const start: RGB = [245, 245, 245];
  const end: RGB = [21, 128, 61];
  return interpolateColor(start, end, value / 100);
}

export { lerp, interpolateColor };
export type { RGB };
