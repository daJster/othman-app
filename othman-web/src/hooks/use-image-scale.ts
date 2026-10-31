// hooks/useImageScale.ts
import { useState, useCallback, type RefObject } from 'react';

export interface ImageScale {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Returns the scale and offset needed to map native image coordinates
 * to the rendered image's actual pixel rect, accounting for object-fit.
 */
export function useImageScale(
  imgRef: RefObject<HTMLImageElement | null>,
  nativeWidth: number,
  nativeHeight: number,
) {
  const [scale, setScale] = useState<ImageScale>({
    scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0,
  });

  const measure = useCallback(() => {
    if (!imgRef) return;
    const img = imgRef.current;
    if (!img) return;

    const renderedW = img.clientWidth;
    const renderedH = img.clientHeight;

    // object-fit: contain — compute the actual image rect inside the element
    const imgAspect = nativeWidth / nativeHeight;
    const elAspect  = renderedW / renderedH;

    let drawW: number, drawH: number;
    if (imgAspect > elAspect) {
      drawW = renderedW;
      drawH = renderedW / imgAspect;
    } else {
      drawH = renderedH;
      drawW = renderedH * imgAspect;
    }

    setScale({
      scaleX:  drawW / nativeWidth,
      scaleY:  drawH / nativeHeight,
      offsetX: (renderedW - drawW) / 2,
      offsetY: (renderedH - drawH) / 2,
    });
  }, [imgRef, nativeWidth, nativeHeight]);

  return { scale, measure };
}