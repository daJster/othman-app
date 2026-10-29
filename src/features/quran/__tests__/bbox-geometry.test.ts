import { bboxToRect, fitBox } from '../bbox-geometry';

/**
 * Geometry is the difference between "the ayah was tapped" and "a rectangle
 * near the ayah was tapped", so it is tested as arithmetic rather than through
 * a rendered style: Jest never applies the percentages to a layout.
 */

const PAGE = { width: 412, height: 600 };

describe('bboxToRect', () => {
  it('turns fractions of the page into percentages', () => {
    expect(
      bboxToRect({ top: 0.1, left: 0.25, bottom: 0.2, right: 0.5 }),
    ).toEqual({
      left: '25%',
      top: '10%',
      width: '25%',
      height: '10%',
    });
  });

  it('keeps a full-page box full-page', () => {
    expect(bboxToRect({ top: 0, left: 0, bottom: 1, right: 1 })).toEqual({
      left: '0%',
      top: '0%',
      width: '100%',
      height: '100%',
    });
  });

  it('rounds to two decimals so float noise cannot change a key', () => {
    expect(
      bboxToRect({ top: 0, left: 0, bottom: 1 / 3, right: 1 / 3 }),
    ).toEqual({ left: '0%', top: '0%', width: '33.33%', height: '33.33%' });
  });

  it('clamps coordinates outside the page', () => {
    expect(bboxToRect({ top: -0.5, left: 1.4, bottom: 1.5, right: 2 })).toEqual(
      { left: '100%', top: '0%', width: '0%', height: '100%' },
    );
  });

  it('renders a non-finite coordinate as zero rather than NaN', () => {
    expect(
      bboxToRect({
        top: Number.NaN,
        left: 0,
        bottom: 0.5,
        right: 0.5,
      }),
    ).toEqual({ left: '0%', top: '0%', width: '50%', height: '50%' });
  });

  it('gives an inverted box zero size instead of a negative one', () => {
    expect(
      bboxToRect({ top: 0.6, left: 0.6, bottom: 0.2, right: 0.2 }),
    ).toEqual({ left: '60%', top: '60%', width: '0%', height: '0%' });
  });
});

describe('fitBox', () => {
  it('fills the height when the container is wide', () => {
    // 800/412 = 1.94, 400/600 = 0.67: height is the constraint.
    expect(fitBox(PAGE, { width: 800, height: 400 })).toEqual({
      width: 274,
      height: 400,
    });
  });

  it('fills the width when the container is tall', () => {
    // 300/412 = 0.73, 1000/600 = 1.67: width is the constraint.
    expect(fitBox(PAGE, { width: 300, height: 1000 })).toEqual({
      width: 300,
      height: 436,
    });
  });

  it('keeps the page aspect ratio', () => {
    const box = fitBox(PAGE, { width: 361, height: 999 });

    expect(box.width / box.height).toBeCloseTo(412 / 600, 2);
  });

  it('is empty before the container has been measured', () => {
    expect(fitBox(PAGE, { width: 0, height: 0 })).toEqual({
      width: 0,
      height: 0,
    });
  });

  it('is empty for a page with no size in the payload', () => {
    expect(
      fitBox({ width: 0, height: 0 }, { width: 500, height: 500 }),
    ).toEqual({ width: 0, height: 0 });
  });

  it('never exceeds the container by a fractional point', () => {
    const box = fitBox(PAGE, { width: 390.5, height: 568.4 });

    expect(box.width).toBeLessThanOrEqual(390.5);
    expect(box.height).toBeLessThanOrEqual(568.4);
  });
});
