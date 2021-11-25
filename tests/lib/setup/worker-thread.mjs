import { isMainThread, parentPort } from 'worker_threads';

if (!isMainThread) {
  globalThis.self = globalThis;

  self.addEventListener = function addEventListener(...args) {
    parentPort.on(...args);
  };

  self.postMessage = function postMessage(data, ...args) {
    parentPort.postMessage({ data }, ...args);
  };
}
