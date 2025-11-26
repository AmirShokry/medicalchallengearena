import { onUnmounted, ref } from "vue";
import { msToMinutesAndSeconds } from "./timeFormatter";
import { any } from "zod";

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

    timeMs.value =
      options.direction === "down"
        ? (options.mins * 60 + options.secs) * 1000
        : 0; //Starting value
    isRunning.value = true;

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
  }
  function pause() {
    stop();
  }
  function resume() {
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
