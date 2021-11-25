import { resolve } from 'path';
import { URL } from 'url';

export function createWorker() {
  const path = new URL('./fixtures/worker.mjs', import.meta.url).pathname;
  return new Worker(path, { type: 'module' });
}
