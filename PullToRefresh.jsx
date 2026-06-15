import { useState, useRef, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function PullToRefresh({ onRefresh, children }) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef(null);
  const startY = useRef(0);
  const dragging = useRef(false);
  const threshold = 80;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } catch (e) {}
    setRefreshing(false);
    setPullDistance(0);
  }, [onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      if (el.scrollTop <= 0) {
        startY.current = e.touches[0].clientY;
        dragging.current = true;
      }
    };

    const onTouchMove = (e) => {
      if (!dragging.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && el.scrollTop <= 0) {
        setPullDistance(Math.min(dy * 0.5, 120));
      }
    };

    const onTouchEnd = () => {
      if (!dragging.current) return;
      dragging.current = false;
      if (pullDistance >= threshold && !refreshing) {
        handleRefresh();
      } else {
        setPullDistance(0);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [pullDistance, refreshing, handleRefresh]);

  return (
    <div className="relative">
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 flex justify-center pointer-events-none z-10 ptr-indicator"
        style={{
          transform: `translateY(${refreshing ? "16px" : `${pullDistance - 40}px`})`,
          opacity: refreshing ? 1 : Math.min(pullDistance / threshold, 1),
        }}
      >
        <div className={`rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1.5 flex items-center gap-2 shadow-sm ${refreshing ? "opacity-100" : ""}`}>
          <Loader2 className={`w-4 h-4 text-indigo-500 ${refreshing ? "animate-spin" : ""}`} />
          <span className="text-xs font-medium text-indigo-600">
            {refreshing ? "Refreshing..." : pullDistance >= threshold ? "Release to refresh" : "Pull to refresh"}
          </span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="overflow-y-auto"
        style={{
          transform: `translateY(${refreshing ? "0px" : "0px"})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
