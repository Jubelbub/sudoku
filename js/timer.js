// timer.js – Game timer module

export function createTimer(displayElement) {
  let startTime = 0;
  let elapsed = 0;
  let running = false;
  let rafId = null;

  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function update() {
    if (!running) return;
    elapsed = performance.now() - startTime;
    if (displayElement) {
      displayElement.textContent = formatTime(elapsed);
    }
    rafId = requestAnimationFrame(update);
  }

  return {
    start() {
      if (running) return;
      startTime = performance.now() - elapsed;
      running = true;
      update();
    },

    stop() {
      if (!running) return elapsed;
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      elapsed = performance.now() - startTime;
      if (displayElement) {
        displayElement.textContent = formatTime(elapsed);
      }
      return elapsed;
    },

    reset() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      elapsed = 0;
      if (displayElement) {
        displayElement.textContent = formatTime(0);
      }
    },

    getElapsed() {
      if (running) return performance.now() - startTime;
      return elapsed;
    },

    isRunning() {
      return running;
    },

    formatTime,
  };
}
