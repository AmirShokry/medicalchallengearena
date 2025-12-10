import { ref, computed, onUnmounted } from "vue";
import { msToMinutesAndSeconds } from "./timeFormatter";

/**
 * Server-authoritative timer that uses server timestamps to calculate remaining time.
 *
 * How it works:
 * 1. Server sends serverTime (current server time) and startTimestamp when question starts
 * 2. Client calculates initial remaining: durationMs - (serverTime - startTimestamp)
 * 3. Client uses performance.now() to track local elapsed time from when timer started
 * 4. Remaining = initialRemaining - localElapsed
 *
 * This approach avoids timezone/clock drift issues because:
 * - We calculate the "remaining time as seen by server" at message receipt
 * - We only measure LOCAL elapsed time using performance.now() (not Date.now())
 * - No absolute timestamp comparisons between client and server
 *
 * NO setInterval or setTimeout used - only requestAnimationFrame for display
 * and visibility change events for catching up after throttling.
 */
export function useServerTimer() {
  // Core state - all times in milliseconds
  let durationMs: number = 600000; // 10 minutes default
  let initialRemainingMs: number = 0; // Remaining time when timer started (from server's perspective)
  let localStartTime: number = 0; // performance.now() when timer started locally
  let pausedRemainingMs: number = 0; // Remaining time when paused
  let isPausedInternal: boolean = false;
  let timeoutCallback: (() => void) | undefined = undefined;
  let hasTimedOut: boolean = false; // Prevent multiple timeout callbacks

  // Reactive state
  const isRunning = ref(false);
  const timeMs = ref<number>(0);
  const time = computed(() => msToMinutesAndSeconds(timeMs.value));

  // Animation frame for display updates
  let rafId: number | null = null;
  let visibilityHandler: (() => void) | null = null;
  // Backup timeout for background tabs (setTimeout still fires, just throttled)
  let backupTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /**
   * Calculate remaining time
   * Uses local elapsed time (performance.now) from when we received the server message
   */
  function calculateRemainingTime(): number {
    if (isPausedInternal) {
      return pausedRemainingMs;
    }
    const localElapsed = performance.now() - localStartTime;
    return Math.max(0, initialRemainingMs - localElapsed);
  }

  /**
   * Handle timeout - called when timer reaches 0
   */
  function handleTimeout() {
    if (hasTimedOut) return; // Prevent multiple calls
    hasTimedOut = true;

    isRunning.value = false;
    timeMs.value = 0;

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (backupTimeoutId) {
      clearTimeout(backupTimeoutId);
      backupTimeoutId = null;
    }

    timeoutCallback?.();
  }

  /**
   * Update displayed time and check for timeout
   */
  function tick() {
    if (!isRunning.value || hasTimedOut) return;

    const remaining = calculateRemainingTime();
    timeMs.value = remaining;

    if (remaining <= 0 && !isPausedInternal) {
      handleTimeout();
      return;
    }

    // Schedule next update (only if not paused)
    if (!isPausedInternal && typeof window !== "undefined") {
      rafId = requestAnimationFrame(tick);
    }
  }

  /**
   * Set up backup timeout for background tabs
   * setTimeout is throttled but still fires in background tabs
   */
  function setupBackupTimeout() {
    if (backupTimeoutId) {
      clearTimeout(backupTimeoutId);
    }

    const remaining = calculateRemainingTime();
    if (remaining <= 0) {
      handleTimeout();
      return;
    }

    // Add 100ms buffer to ensure we're past the deadline
    backupTimeoutId = setTimeout(() => {
      if (!isRunning.value || isPausedInternal || hasTimedOut) return;

      const currentRemaining = calculateRemainingTime();
      if (currentRemaining <= 0) {
        handleTimeout();
      } else {
        // Not yet expired, reschedule
        setupBackupTimeout();
      }
    }, remaining + 100);
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
   * @param serverTime - Current server time when the message was sent
   * @param startTimestamp - Server's question start timestamp
   * @param duration - Duration in milliseconds
   * @param onTimeout - Callback when timer reaches 0
   */
  function start(
    serverTime: number,
    startTimestamp: number,
    duration: number,
    onTimeout?: () => void
  ) {
    // Reset state
    hasTimedOut = false;
    isPausedInternal = false;
    pausedRemainingMs = 0;

    durationMs = duration;
    timeoutCallback = onTimeout;

    // Calculate remaining time from server's perspective at the moment of message
    // This avoids timezone issues - we just trust the server's calculation
    const serverElapsed = serverTime - startTimestamp;
    initialRemainingMs = Math.max(0, duration - serverElapsed);

    // Record when we started locally (using performance.now for accuracy)
    localStartTime = performance.now();

    // Set initial display value
    timeMs.value = initialRemainingMs;
    isRunning.value = true;

    // Check if already timed out (shouldn't happen normally, but prevents infinite loop)
    if (initialRemainingMs <= 0) {
      // Use setTimeout to defer the timeout callback, avoiding synchronous loops
      setTimeout(() => handleTimeout(), 0);
      return;
    }

    setupVisibilityListener();

    // Start the display update loop
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);

    // Set up backup timeout for background tabs
    setupBackupTimeout();

    console.log(
      `[Timer] Started. Server elapsed: ${serverElapsed}ms, Initial remaining: ${initialRemainingMs}ms`
    );
  }

  /**
   * Sync with server time (for reconnection or when receiving updated timestamps)
   * @param serverTime - Current server time
   * @param startTimestamp - Server's question start timestamp
   * @param duration - Duration in milliseconds (optional)
   */
  function sync(serverTime: number, startTimestamp: number, duration?: number) {
    if (duration !== undefined) {
      durationMs = duration;
    }

    // Recalculate initial remaining based on new server info
    const serverElapsed = serverTime - startTimestamp;
    initialRemainingMs = Math.max(0, durationMs - serverElapsed);
    localStartTime = performance.now();

    // If running, immediately update display
    if (isRunning.value && !isPausedInternal) {
      tick();
      setupBackupTimeout();
    }
  }

  /**
   * Stop the timer
   */
  function stop() {
    isRunning.value = false;
    isPausedInternal = false;
    hasTimedOut = false;

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (backupTimeoutId) {
      clearTimeout(backupTimeoutId);
      backupTimeoutId = null;
    }

    removeVisibilityListener();
  }

  /**
   * Pause the timer
   */
  function pause() {
    if (!isRunning.value || isPausedInternal) return;

    isPausedInternal = true;
    pausedRemainingMs = calculateRemainingTime();

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (backupTimeoutId) {
      clearTimeout(backupTimeoutId);
      backupTimeoutId = null;
    }
  }

  /**
   * Resume the timer
   * @param serverTime - Current server time (optional, for clock sync)
   * @param newRemainingMs - New remaining time from server (optional)
   */
  function resume(serverTime?: number, newRemainingMs?: number) {
    if (!isRunning.value || !isPausedInternal) return;

    if (newRemainingMs !== undefined) {
      // Use server-provided remaining time
      initialRemainingMs = newRemainingMs;
    } else {
      // Use the paused remaining time
      initialRemainingMs = pausedRemainingMs;
    }

    // Reset local start time
    localStartTime = performance.now();

    isPausedInternal = false;
    pausedRemainingMs = 0;

    // Restart display updates
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);

    // Restart backup timeout
    setupBackupTimeout();
  }

  /**
   * Restart timer with new server time info
   * @param serverTime - Current server time
   * @param startTimestamp - Server's question start timestamp
   * @param duration - Duration in milliseconds
   */
  function restart(
    serverTime: number,
    startTimestamp: number,
    duration: number
  ) {
    stop();
    start(serverTime, startTimestamp, duration, timeoutCallback);
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
