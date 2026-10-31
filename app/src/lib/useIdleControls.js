import { useCallback, useEffect, useRef, useState } from 'react';

// While the film plays, the controls step aside on their own and come back the
// moment either of you touches or moves across the picture.
export default function useIdleControls(active, delay = 2800) {
  const [shown, setShown] = useState(true);
  const timerRef = useRef(null);

  const wake = useCallback(() => {
    setShown(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setShown(false), delay);
  }, [delay]);

  const rest = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setShown(true);
  }, []);

  useEffect(() => {
    window.clearTimeout(timerRef.current);
    if (!active) {
      setShown(true);
      return undefined;
    }
    wake();
    return () => window.clearTimeout(timerRef.current);
  }, [active, wake]);

  return { shown, wake, rest };
}