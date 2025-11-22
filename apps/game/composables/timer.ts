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
 * @overview A composable function that creates a timer using a Web Worker because browsers throttle setInterval and setTimeout in inactive tabs
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
  const isRunning = ref(false);
  const timeMs = ref<number>(0);
  const time = computed(() => msToMinutesAndSeconds(timeMs.value));
  function start(_options?: Options) {
    if (_options) Object.assign(options, _options);
    timeWorker = createWorker(options.direction);
    timeMs.value =
      options.direction === "down"
        ? (options.mins * 60 + options.secs) * 1000
        : 0; //Starting value
    timeWorker.postMessage({
      action: "start",
      mins: options.mins,
      secs: options.secs,
    });
    isRunning.value = true;
    timeWorker.onmessage = (e: MessageEvent<WorkerEventMessages>) => {
      timeMs.value = e.data.message;
      if (e?.data?.event === "timeout") {
        isRunning.value = false;
        options.timeoutCallback?.();
      }
    };
  }
  function getStartingTimeMs() {
    return (options.mins * 60 + options.secs) * 1000;
  }
  function getElapseTimeMs() {
    return (options.mins * 60 + options.secs) * 1000 - timeMs.value;
  }
  function stop() {
    if (!timeWorker) return;
    timeWorker.postMessage({ action: "stop" });
    isRunning.value = false;
  }
  function pause() {
    stop();
  }
  function resume() {
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

function downTimer() {
  let interval: ReturnType<typeof setInterval>;
  onmessage = function (e: MessageEvent<ClientEventMessages>) {
    if (e.data.action === "stop") return clearInterval(interval);
    if (e.data.action === "start") {
      let mins = e.data.mins;
      let seconds = e.data.secs;
      interval = setInterval(() => {
        if (seconds <= 0 && mins <= 0) {
          clearInterval(interval);
          return postMessage({ message: 0, event: "timeout" });
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
}

function upTimer() {
  let interval: ReturnType<typeof setInterval>;
  onmessage = function (e: MessageEvent<ClientEventMessages>) {
    if (e.data.action === "stop") return clearInterval(interval);
    if (e.data.action === "start") {
      let target_mins = e.data.mins,
        target_secs = e.data.secs,
        mins = 0,
        secs = 0;
      interval = setInterval(() => {
        if (mins === target_mins && secs === target_secs) {
          clearInterval(interval);
          return postMessage({
            message: mins * 60 + secs * 1000,
            event: "timeout",
          });
        }
        secs++;
        if (secs >= 60) {
          mins++;
          secs = 0;
        }
        self.postMessage({ message: mins * 60 + secs * 1000 });
      }, 1000);
    }
  };
}

function createWorker(direction: "up" | "down" = "down") {
  const workerHandler = `function(){(${direction === "down" ? downTimer.toString() : upTimer.toString()})()}`;
  const workerBlobURL = URL.createObjectURL(
    new Blob(["(", workerHandler, ")()"], { type: "application/javascript" })
  );
  const worker = new Worker(workerBlobURL);
  URL.revokeObjectURL(workerBlobURL);
  return worker;
}
