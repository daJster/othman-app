import {
  HEATMAP_MAX_WIDTH,
  HEATMAP_MIN_COLUMNS,
  HEATMAP_SCREEN_PADDING,
  heatmapGeometry,
} from '@/features/progress/heatmap-geometry';

/**
 * Geometry is the one part of the heatmap that can be wrong without looking
 * broken: a grid 4px wider than its container drops the last cell of every row
 * onto a line of its own. These tests pin the invariants.
 */
describe('heatmapGeometry', () => {
  const widths = [
    320, 360, 390, 414, 480, 600, 767, 768, 834, 1023, 1024, 1280,
  ];

  it('never overflows the space it was given', () => {
    for (const width of widths) {
      const geometry = heatmapGeometry(width);

      expect(geometry.width).toBeLessThanOrEqual(
        Math.min(width - HEATMAP_SCREEN_PADDING, HEATMAP_MAX_WIDTH),
      );
    }
  });

  it('derives the width from whole columns and the gap', () => {
    for (const width of widths) {
      const { cell, gap, columns, width: gridWidth } = heatmapGeometry(width);

      expect(gridWidth).toBe(columns * cell + (columns - 1) * gap);
    }
  });

  it('steps the cell size at the md and lg breakpoints', () => {
    expect(heatmapGeometry(360).cell).toBe(24);
    expect(heatmapGeometry(767).cell).toBe(24);
    expect(heatmapGeometry(768).cell).toBe(28);
    expect(heatmapGeometry(1023).cell).toBe(28);
    expect(heatmapGeometry(1024).cell).toBe(32);
  });

  it('gives a phone a tall grid and a tablet a wide one', () => {
    expect(heatmapGeometry(360).columns).toBeLessThan(
      heatmapGeometry(1024).columns,
    );
  });

  it('keeps at least the minimum number of columns at absurd widths', () => {
    expect(heatmapGeometry(0).columns).toBe(HEATMAP_MIN_COLUMNS);
    expect(heatmapGeometry(120).columns).toBe(HEATMAP_MIN_COLUMNS);
  });

  it('stops growing once the grid reaches its maximum width', () => {
    expect(heatmapGeometry(1400).columns).toBe(heatmapGeometry(2000).columns);
  });
});
