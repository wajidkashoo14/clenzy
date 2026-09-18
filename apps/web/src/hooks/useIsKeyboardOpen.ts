import { useEffect, useState } from 'react';

const SHRINK_THRESHOLD_PX = 150;

/**
 * Heuristic for "the on-screen keyboard is probably open": the visual
 * viewport has shrunk substantially versus the layout viewport. Supported
 * on iOS Safari and Android Chrome, the two platforms this matters for —
 * see docs/ACCESSIBILITY_AND_MOBILE.md §1 (the bottom nav must hide while
 * the keyboard is open so it doesn't cover the focused field).
 */
export function useIsKeyboardOpen(): boolean {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    function handleResize(): void {
      if (!viewport) return;
      const shrink = window.innerHeight - viewport.height;
      setIsOpen(shrink > SHRINK_THRESHOLD_PX);
    }

    viewport.addEventListener('resize', handleResize);
    return () => viewport.removeEventListener('resize', handleResize);
  }, []);

  return isOpen;
}
