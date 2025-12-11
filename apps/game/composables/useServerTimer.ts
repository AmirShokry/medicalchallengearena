import { ref, computed, onUnmounted } from "vue";
import { msToMinutesAndSeconds } from "./timeFormatter";

/**
 * Simplified timer stub - no actual timing/timeout functionality.
 * All elapsed time calculations return 0ms.
 * Timer display is always "infinite" (no countdown).
 */
export function useServerTimer() {
  // Reactive state - always shows "infinite" time
  const isRunning = ref(false);
  const timeMs = ref<number>(Infinity);
  const time = computed(() => "∞");

  /**
   * Start the timer (no-op, just sets running state)
   */
  function start(
    _serverTime?: number,
    _startTimestamp?: number,
    _duration?: number,
    _onTimeout?: () => void
  ) {
    isRunning.value = true;
  }

  /**
   * Sync with server time (no-op)
   */
  function sync(
    _serverTime?: number,
    _startTimestamp?: number,
    _duration?: number
  ) {
    // No-op
  }

  /**
   * Stop the timer (no-op, just sets running state)
   */
  function stop() {
    isRunning.value = false;
  }

  /**
   * Pause the timer (no-op)
   */
  function pause() {
    // No-op
  }

  /**
   * Resume the timer (no-op)
   */
  function resume(_serverTime?: number, _newRemainingMs?: number) {
    // No-op
  }

  /**
   * Restart timer (no-op, just sets running state)
   */
  function restart(
    _serverTime?: number,
    _startTimestamp?: number,
    _duration?: number
  ) {
    isRunning.value = true;
  }

  /**
   * Get elapsed time in milliseconds - always returns 0
   */
  function getElapseTimeMs(): number {
    return 0;
  }

  /**
   * Get the total/starting duration in milliseconds - always returns 0
   */
  function getStartingTimeMs(): number {
    return 0;
  }

  /**
   * Clean up (no-op)
   */
  function destroy() {
    isRunning.value = false;
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
