/**
 * Grid geometry for the 114-cell heatmap.
 *
 * Pure maths, kept out of the component so the column/width behaviour can be
 * tested without a renderer — the one thing that must not happen is a cell row
 * overflowing its container at some intermediate width.
 *
 * The cell size steps at Tailwind's `md` (768) and `lg` (1024) breakpoints, and
 * the column count follows from the available width rather than the reverse: a
 * phone gets 10–12 columns (a tall, thumb-sized grid), a tablet gets 20+.
 *
 * The grid is not forced to fill the width — leftover pixels stay as margin. A
 * cell cannot be fractional, and stretching it to absorb the remainder would
 * make rows of differently sized squares.
 */

export const HEATMAP_GAP = 4;
export const HEATMAP_SCREEN_PADDING = 32;
export const HEATMAP_MAX_WIDTH = 720;
export const HEATMAP_MIN_COLUMNS = 6;

export type HeatmapGeometry = {
  /** Cell edge in px (the cell is square). */
  cell: number;
  /** Space between cells, matching `gap-1`. */
  gap: number;
  columns: number;
  /** Exact width of the grid, so rows break where the maths says they do. */
  width: number;
};

function cellFor(windowWidth: number): number {
  if (windowWidth >= 1024) return 32;
  if (windowWidth >= 768) return 28;

  return 24;
}

export function heatmapGeometry(windowWidth: number): HeatmapGeometry {
  const available = Math.max(
    0,
    Math.min(windowWidth - HEATMAP_SCREEN_PADDING, HEATMAP_MAX_WIDTH),
  );
  const cell = cellFor(windowWidth);
  const columns = Math.max(
    HEATMAP_MIN_COLUMNS,
    Math.floor((available + HEATMAP_GAP) / (cell + HEATMAP_GAP)),
  );

  return {
    cell,
    gap: HEATMAP_GAP,
    columns,
    width: columns * cell + (columns - 1) * HEATMAP_GAP,
  };
}
