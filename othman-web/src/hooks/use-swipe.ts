import { useCallback, useRef } from "react";

export function useSwipe(onLeft: () => void, onRight: () => void) {
  const startX = useRef<number | null>(null);
 
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  }, []);
 
  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (startX.current === null) return;
      const delta = e.changedTouches[0].clientX - startX.current;
      if (Math.abs(delta) > 100) {
        if (delta < 0) onRight();   // swiped left  → onRight
        else           onLeft();  // swiped right → onLeft
      }
      startX.current = null;
    },
    [onLeft, onRight]
  );
 
  return { onTouchStart, onTouchEnd };
}
 