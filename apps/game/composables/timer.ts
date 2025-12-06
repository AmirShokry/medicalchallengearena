import { onUnmounted, ref } from "vue";
import { msToMinutesAndSeconds } from "./timeFormatter";

type actions = "start" | "stop";
type ClientEventMessages = { action: actions; mins: number; secs: number };
type WorkerEventMessages = { event?: "timeout"; message: number };
type Options = {
  mins: number;
  secs: number;
  timeoutCallback?: Function;
  direction?: "down" | "up";
};

/**
 * @overview A composable function that creates a timer using a Web Worker because browsers throttle setInterval and setTimeout in inactive tabs.
 * Falls back to setInterval if Web Worker fails (e.g., in production builds where minification can break inline workers).
 * Uses Date.now() delta calculations to correct time drift when tab becomes visible again (handles browser throttling).
 * @param options Configuration options for the timer
 * @returns
 */
export function useTimer(
  options = {
    mins: 0,
    secs: 0,
    timeoutCallback: () => undefined,
    direction: "down",
  } as Options
) {
  let timeWorker: Worker | undefined = undefined;
  let fallbackInterval: any = undefined;
  let usingFallback = false;
  const isRunning = ref(false);
  const timeMs = ref<number>(0);
  const time = computed(() => msToMinutesAndSeconds(timeMs.value));

  // Track timestamps to handle browser throttling when tab is minimized
  let startTimestamp: number = 0;
  let targetDurationMs: number = 0;
  let visibilityHandler: (() => void) | null = null;

  /**
   * Handles visibility change to recalculate timer based on actual elapsed time.
   * This is crucial because when the tab is minimized, browsers throttle intervals/timers.
   */
  function handleVisibilityChange() {
    if (
      document.visibilityState === "visible" &&
      isRunning.value &&
      startTimestamp > 0
    ) {
      const elapsedMs = Date.now() - startTimestamp;

      if (options.direction === "down") {
        const remainingMs = Math.max(0, targetDurationMs - elapsedMs);
        timeMs.value = remainingMs;

        // Check if timer should have expired while tab was hidden
        if (remainingMs <= 0) {
          stopInternal();
          isRunning.value = false;
          options.timeoutCallback?.();
          return;
        }

        // Restart the timer/worker with corrected time
        restartWithCorrectTime();
      } else {
        // For "up" direction
        const currentMs = Math.min(elapsedMs, targetDurationMs);
        timeMs.value = currentMs;

        // Check if timer should have completed while tab was hidden
        if (currentMs >= targetDurationMs) {
          stopInternal();
          isRunning.value = false;
          options.timeoutCallback?.();
          return;
        }

        // Restart the timer/worker with corrected time
        restartWithCorrectTime();
      }
    }
  }

  function restartWithCorrectTime() {
    if (usingFallback) {
      stopFallback();
      const totalSeconds = Math.ceil(timeMs.value / 1000);
      if (options.direction === "down") {
        options.mins = Math.floor(totalSeconds / 60);
        options.secs = totalSeconds % 60;
      }
      startFallbackTimer();
    } else if (timeWorker) {
      // Restart worker with corrected time
      timeWorker.postMessage({ action: "stop" });
      const totalSeconds = Math.ceil(timeMs.value / 1000);
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;

      if (options.direction === "down") {
        timeWorker.postMessage({ action: "start", mins, secs });
      } else {
        // For up timer, we need to calculate remaining target
        const remainingMs = targetDurationMs - timeMs.value;
        const remainingSecs = Math.ceil(remainingMs / 1000);
        const targetMins = Math.floor(remainingSecs / 60);
        const targetSecs = remainingSecs % 60;
        timeWorker.postMessage({
          action: "start",
          mins: targetMins,
          secs: targetSecs,
        });
      }
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

  function stopInternal() {
    if (usingFallback) {
      stopFallback();
    } else if (timeWorker) {
      timeWorker.postMessage({ action: "stop" });
    }
  }

  function startFallbackTimer() {
    usingFallback = true;
    let mins = options.mins;
    let secs = options.secs;

    if (options.direction === "down") {
      fallbackInterval = window.setInterval(() => {
        if (secs <= 0 && mins <= 0) {
          window.clearInterval(fallbackInterval);
          fallbackInterval = undefined;
          timeMs.value = 0;
          isRunning.value = false;
          options.timeoutCallback?.();
          return;
        }
        if (secs > 0) secs--;
        else if (mins > 0) {
          mins--;
          secs = 59;
        }
        timeMs.value = (mins * 60 + secs) * 1000;
      }, 1000);
    } else {
      // up timer
      let currentMins = 0;
      let currentSecs = 0;
      fallbackInterval = window.setInterval(() => {
        if (currentMins === mins && currentSecs === secs) {
          window.clearInterval(fallbackInterval);
          fallbackInterval = undefined;
          isRunning.value = false;
          options.timeoutCallback?.();
          return;
        }
        currentSecs++;
        if (currentSecs >= 60) {
          currentMins++;
          currentSecs = 0;
        }
        timeMs.value = (currentMins * 60 + currentSecs) * 1000;
      }, 1000);
    }
  }

  function start(_options?: Options) {
    if (_options) Object.assign(options, _options);

    // Track the start time and target duration for visibility change handling
    targetDurationMs = (options.mins * 60 + options.secs) * 1000;
    startTimestamp = Date.now();

    timeMs.value =
      options.direction === "down"
        ? (options.mins * 60 + options.secs) * 1000
        : 0; //Starting value
    isRunning.value = true;

    // Set up visibility change listener to handle tab minimization
    setupVisibilityListener();

    try {
      timeWorker = createWorker(options.direction);

      // Set up error handler to fall back to setInterval
      timeWorker.onerror = (error) => {
        console.warn("Web Worker failed, falling back to setInterval:", error);
        timeWorker?.terminate();
        timeWorker = undefined;
        startFallbackTimer();
      };

      timeWorker.postMessage({
        action: "start",
        mins: options.mins,
        secs: options.secs,
      });

      timeWorker.onmessage = (e: MessageEvent<WorkerEventMessages>) => {
        timeMs.value = e.data.message;
        if (e?.data?.event === "timeout") {
          isRunning.value = false;
          removeVisibilityListener();
          options.timeoutCallback?.();
        }
      };
    } catch (error) {
      // Web Worker creation failed, use fallback
      console.warn(
        "Web Worker creation failed, falling back to setInterval:",
        error
      );
      startFallbackTimer();
    }
  }
  function getStartingTimeMs() {
    return (options.mins * 60 + options.secs) * 1000;
  }
  function getElapseTimeMs() {
    return (options.mins * 60 + options.secs) * 1000 - timeMs.value;
  }
  function stopFallback() {
    if (fallbackInterval) {
      window.clearInterval(fallbackInterval);
      fallbackInterval = undefined;
    }
  }
  function stop() {
    if (usingFallback) {
      stopFallback();
    } else if (timeWorker) {
      timeWorker.postMessage({ action: "stop" });
    }
    isRunning.value = false;
    removeVisibilityListener();
  }
  function pause() {
    stop();
  }
  function resume() {
    // Update start timestamp for visibility tracking
    const currentTimeMs = timeMs.value;
    if (options.direction === "down") {
      targetDurationMs = currentTimeMs;
    } else {
      targetDurationMs = targetDurationMs - currentTimeMs;
    }
    startTimestamp = Date.now();
    setupVisibilityListener();

    if (usingFallback) {
      // For fallback, we need to restart with current time
      const totalSeconds = Math.ceil(timeMs.value / 1000);
      options.mins = Math.floor(totalSeconds / 60);
      options.secs = totalSeconds % 60;
      isRunning.value = true;
      startFallbackTimer();
      return;
    }
    if (!timeWorker) return;
    const totalSeconds = Math.ceil(timeMs.value / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    timeWorker.postMessage({
      action: "start",
      mins,
      secs,
    });
    isRunning.value = true;
  }
  function restart() {
    // Reset timestamps for visibility tracking
    targetDurationMs = (options.mins * 60 + options.secs + 1) * 1000;
    startTimestamp = Date.now();
    setupVisibilityListener();

    if (usingFallback) {
      stopFallback();
      options.mins = options.mins;
      options.secs = options.secs + 1;
      startFallbackTimer();
      return;
    }
    if (!timeWorker) return;
    timeWorker.postMessage({ action: "stop" });
    timeWorker.postMessage({
      action: "start",
      mins: options.mins,
      secs: options.secs + 1,
    });
  }

  function destroy() {
    timeMs.value = options.mins = options.secs = 0;
    isRunning.value = false;
    removeVisibilityListener();

    if (usingFallback) {
      stopFallback();
      usingFallback = false;
      return;
    }

    if (!timeWorker) return;
    // Clean up interval in worker before terminating
    timeWorker.postMessage({ action: "stop" });
    timeWorker.terminate();
    timeWorker = undefined;
  }

  onUnmounted(destroy);
  return {
    time,
    timeMs,
    start,
    stop,
    pause,
    resume,
    isRunning,
    destroy,
    restart,
    getElapseTimeMs,
    getStartingTimeMs,
  };
}

function createWorker(direction: "up" | "down" = "down") {
  // Use string-based worker code to avoid minification issues with setInterval
  // Web Workers have their own global scope, so we use self.setInterval/clearInterval explicitly
  const downTimerCode = `
    let interval;
    self.onmessage = function(e) {
      if (e.data.action === "stop") {
        self.clearInterval(interval);
        return;
      }
      if (e.data.action === "start") {
        let mins = e.data.mins;
        let seconds = e.data.secs;
        interval = self.setInterval(function() {
          if (seconds <= 0 && mins <= 0) {
            self.clearInterval(interval);
            self.postMessage({ message: 0, event: "timeout" });
            return;
          }
          if (seconds > 0) seconds--;
          else if (mins > 0) {
            mins--;
            seconds = 59;
          }
          self.postMessage({ message: (mins * 60 + seconds) * 1000 });
        }, 1000);
      }
    };
  `;

  const upTimerCode = `
    let interval;
    self.onmessage = function(e) {
      if (e.data.action === "stop") {
        self.clearInterval(interval);
        return;
      }
      if (e.data.action === "start") {
        let target_mins = e.data.mins;
        let target_secs = e.data.secs;
        let mins = 0;
        let secs = 0;
        interval = self.setInterval(function() {
          if (mins === target_mins && secs === target_secs) {
            self.clearInterval(interval);
            self.postMessage({ message: (mins * 60 + secs) * 1000, event: "timeout" });
            return;
          }
          secs++;
          if (secs >= 60) {
            mins++;
            secs = 0;
          }
          self.postMessage({ message: (mins * 60 + secs) * 1000 });
        }, 1000);
      }
    };
  `;

  const workerCode = direction === "down" ? downTimerCode : upTimerCode;
  const workerBlobURL = URL.createObjectURL(
    new Blob([workerCode], { type: "application/javascript" })
  );
  const worker = new Worker(workerBlobURL);
  URL.revokeObjectURL(workerBlobURL);
  return worker;
}
