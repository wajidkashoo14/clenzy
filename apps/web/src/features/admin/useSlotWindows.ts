import type { PincodeCheckResult, SlotWindow } from '@clenzy/shared';
import { useEffect, useState } from 'react';
import { getSlots } from '@/features/checkout/api';
import { apiGet } from '@/lib/api-client';

interface LoadedWindows {
  requestKey: string;
  windows: SlotWindow[];
}

/**
 * Resolves a pincode to its service area, then fetches that area's slot
 * windows for one date. Tracks `{requestKey, windows}` rather than calling
 * `setState` synchronously in the effect body (which would violate
 * react-hooks/set-state-in-effect) — every `setState` here happens inside a
 * `.then()`/`.catch()` callback, and staleness is detected by comparing keys.
 */
export function useSlotWindows(pincode: string, date: string, type: 'pickup' | 'delivery') {
  const requestKey = `${pincode}|${date}|${type}`;
  const [result, setResult] = useState<LoadedWindows | null>(null);
  const isValid = pincode.length === 6 && Boolean(date);

  useEffect(() => {
    if (!isValid) return;
    let cancelled = false;
    apiGet<PincodeCheckResult>(`/api/v1/areas/check?pincode=${pincode}`)
      .then((areaResult) => {
        if (cancelled) return undefined;
        if (!areaResult.serviceable) {
          setResult({ requestKey, windows: [] });
          return undefined;
        }
        return getSlots({ type, areaId: areaResult.area.id, from: date, days: 1 }).then((slots) => {
          if (!cancelled) {
            setResult({
              requestKey,
              windows: slots.dates[0]?.windows.filter((w) => !w.disabled) ?? [],
            });
          }
        });
      })
      .catch(() => {
        if (!cancelled) setResult({ requestKey, windows: [] });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, isValid]);

  const isCurrent = result?.requestKey === requestKey;
  return {
    windows: isCurrent ? result.windows : [],
    isLoading: isValid && !isCurrent,
  };
}
