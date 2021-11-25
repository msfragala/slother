import { isMainThread, Worker } from 'worker_threads';

if (isMainThread) {
  globalThis.Worker = class MockWorker {
    constructor(...args) {
      this.worker = new Worker(...args);
    }

    postMessage(data, ...args) {
      this.worker.postMessage({ data }, ...args);
    }

    addEventListener(...args) {
      this.worker.on(...args);
    }

    removeEventListener(...args) {
      this.worker.off(...args);
    }

    terminate() {
      return this.worker.terminate();
    }
  };
}
