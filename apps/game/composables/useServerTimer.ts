import { ref, computed, onUnmounted } from "vue";
import { msToMinutesAndSeconds } from "./timeFormatter";

/**
 * Server-authoritative timer that uses server timestamps to calculate remaining time.
 *
 * How it works:
 * 1. Server sends startTimestamp and durationMs when question starts
 * 2. Client calculates: remaining = durationMs - (Date.now() - startTimestamp)
 * 3. Uses requestAnimationFrame for display updates (smooth, but not critical for correctness)
 * 4. On visibility change (tab becomes visible), immediately recalculates correct time
 * 5. Timeout detection: when remaining <= 0, calls timeoutCallback
 *
 * This is immune to browser throttling because even if RAF is throttled,
 * the next time it runs (or on visibility change), it calculates based on
 * actual elapsed time, not how many times the callback ran.
 *
 * NO setInterval or setTimeout used - only requestAnimationFrame for display
 * and visibility change events for catching up after throttling.
 */
export function useServerTimer() {
  // Core state - all times in milliseconds
  let serverStartTimestamp: number = 0;
  let durationMs: number = 600000; // 10 minutes default
  let pausedTimeMs: number = 0; // Time remaining when paused
  let isPausedInternal: boolean = false;
  let timeoutCallback: (() => void) | undefined = undefined;

  // Reactive state
  const isRunning = ref(false);
  const timeMs = ref<number>(0);
  const time = computed(() => msToMinutesAndSeconds(timeMs.value));

  // Animation frame for display updates
  let rafId: number | null = null;
  let visibilityHandler: (() => void) | null = null;

  /**
   * Calculate remaining time based on server start timestamp
   */
  function calculateRemainingTime(): number {
    if (isPausedInternal) {
      return pausedTimeMs;
    }
    const elapsed = Date.now() - serverStartTimestamp;
    return Math.max(0, durationMs - elapsed);
  }

  /**
   * Update displayed time and check for timeout
   */
  function tick() {
    if (!isRunning.value) return;

    const remaining = calculateRemainingTime();
    timeMs.value = remaining;

    if (remaining <= 0 && !isPausedInternal) {
      // Timeout!
      isRunning.value = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      timeoutCallback?.();
      return;
    }

    // Schedule next update (only if not paused)
    if (!isPausedInternal && typeof window !== "undefined") {
      rafId = requestAnimationFrame(tick);
    }
  }

  /**
   * Handle tab visibility change - recalculate time immediately
   * This is crucial for handling browser throttling
   */
  function handleVisibilityChange() {
    if (
      document.visibilityState === "visible" &&
      isRunning.value &&
      !isPausedInternal
    ) {
      // Immediately recalculate and check for timeout
      tick();
    }
  }

  function setupVisibilityListener() {
    if (typeof document !== "undefined" && !visibilityHandler) {
      visibilityHandler = handleVisibilityChange;
      document.addEventListener("visibilitychange", visibilityHandler);
    }
  }

  function removeVisibilityListener() {
    if (typeof document !== "undefined" && visibilityHandler) {
      document.removeEventListener("visibilitychange", visibilityHandler);
      visibilityHandler = null;
    }
  }

  /**
   * Start the timer
   * @param startTs - Server's start timestamp (from questionStarted event)
   * @param duration - Duration in milliseconds
   * @param onTimeout - Callback when timer reaches 0
   */
  function start(startTs?: number, duration?: number, onTimeout?: () => void) {
    // Use provided values or defaults
    serverStartTimestamp = startTs ?? Date.now();
    durationMs = duration ?? 600000;
    timeoutCallback = onTimeout;
    isPausedInternal = false;
    pausedTimeMs = 0;

    // Set initial display value
    timeMs.value = durationMs;
    isRunning.value = true;

    setupVisibilityListener();

    // Start the display update loop
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  /**
   * Sync with server time (for reconnection or when receiving updated timestamps)
   */
  function sync(startTs: number, duration?: number) {
    serverStartTimestamp = startTs;
    if (duration !== undefined) {
      durationMs = duration;
    }

    // If running, immediately update display
    if (isRunning.value && !isPausedInternal) {
      tick();
    }
  }

  /**
   * Stop the timer
   */
  function stop() {
    isRunning.value = false;
    isPausedInternal = false;

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    removeVisibilityListener();
  }

  /**
   * Pause the timer
   */
  function pause() {
    if (!isRunning.value || isPausedInternal) return;

    isPausedInternal = true;
    pausedTimeMs = calculateRemainingTime();

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  /**
   * Resume the timer
   * @param newStartTs - New effective start timestamp from server (accounts for pause duration)
   */
  function resume(newStartTs?: number) {
    if (!isRunning.value || !isPausedInternal) return;

    if (newStartTs !== undefined) {
      // Use server-provided adjusted timestamp
      serverStartTimestamp = newStartTs;
    } else {
      // If no new timestamp, adjust locally (less accurate but works)
      serverStartTimestamp = Date.now() - (durationMs - pausedTimeMs);
    }

    isPausedInternal = false;
    pausedTimeMs = 0;

    // Restart display updates
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  /**
   * Restart timer with new server timestamp
   */
  function restart(startTs?: number, duration?: number) {
    stop();
    start(startTs, duration, timeoutCallback);
  }

  /**
   * Get elapsed time in milliseconds
   */
  function getElapseTimeMs(): number {
    return durationMs - timeMs.value;
  }

  /**
   * Get the total/starting duration in milliseconds
   */
  function getStartingTimeMs(): number {
    return durationMs;
  }

  /**
   * Clean up
   */
  function destroy() {
    stop();
    timeMs.value = 0;
  }

  onUnmounted(destroy);

  return {
    time,
    timeMs,
    isRunning,
    start,
    stop,
    pause,
    resume,
    restart,
    sync,
    destroy,
    getElapseTimeMs,
    getStartingTimeMs,
  };
}
