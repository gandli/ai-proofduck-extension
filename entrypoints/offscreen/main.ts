// entrypoints/offscreen/main.ts

let worker: Worker | null = null;

function ensureWorker() {
  if (worker) return worker;
  console.log('[Offscreen] Initializing Model Worker...');
  
  // WXT builds each entrypoint separately. 
  // We point to the worker entrypoint which is also a separate file in WXT.
  worker = new Worker(new URL('../sidepanel/worker.ts', import.meta.url), {
    type: 'module',
  });

  worker.onmessage = (event) => {
    // Forward everything from worker to background/sidepanel
    chrome.runtime.sendMessage({
      type: 'WORKER_UPDATE',
      data: event.data
    }).catch(() => {
      // No listeners, safe to ignore
    });

    // Update storage for status recovery (mirrors old background logic)
    const { type, progress } = event.data;
    if (type === 'ready' || type === 'error' || type === 'progress') {
      let engineStatus = 'idle';
      if (type === 'ready') engineStatus = 'ready';
      if (type === 'error') engineStatus = 'error';
      if (type === 'progress') engineStatus = 'loading';

      chrome.storage.local.set({ 
        engineStatus,
        lastProgress: progress
      });
    }
  };
  return worker;
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.target !== 'offscreen') return;

  console.log('[Offscreen] Received message:', message.type);

  switch (message.type) {
    case 'INIT_ENGINE': {
      const w = ensureWorker();
      w.postMessage({ type: 'load', settings: message.settings });
      break;
    }
    case 'GENERATE': {
      const w = ensureWorker();
      w.postMessage({
        type: 'generate',
        text: message.text,
        mode: message.mode,
        settings: message.settings
      });
      break;
    }
    case 'RESET_ENGINE': {
      if (worker) {
        worker.terminate();
        worker = null;
      }
      break;
    }
  }
});

console.log('[Offscreen] Script loaded and listening.');
