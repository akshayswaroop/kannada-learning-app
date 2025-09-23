import { useEffect, useRef, useState } from "react";

export const DEFAULT_TIME_LIMIT = 120;

export function useRoundTimer({ enabled = true, limit = DEFAULT_TIME_LIMIT, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(limit);
  const timerRef = useRef(null);
  const limitRef = useRef(limit);

  useEffect(() => { limitRef.current = limit; }, [limit]);

  useEffect(() => {
    if (!enabled) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(limitRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current); timerRef.current = null; onExpire && onExpire(); return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [enabled, onExpire]);

  return { timeLeft };
}

export function getTimeLimit() { return DEFAULT_TIME_LIMIT; }

