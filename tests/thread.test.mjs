import './lib/setup/main-thread.mjs';
import { test } from 'uvu';
import { Thread } from '../dist/slother.mjs';
import * as assert from 'uvu/assert';
import { resolve } from 'node:path';
import { repeat } from './lib/repeat.mjs';
import { createWorker } from './lib/create-worker.mjs';

test.before.each(($) => {
  $.thread = new Thread(createWorker);
});

test.after.each(async ($) => {
  await $.thread.terminate();
});

test('Does not load worker until sending message', async ({ thread }) => {
  assert.is(thread.meta.workerCreated, false);
  thread.postMessage({ name: 'hello', payload: '1k#9d8' });
  assert.is(thread.meta.workerCreated, true);
});

test('Sends messages immediately if within concurrency threshold', async ({ thread }) => {
  const action = { name: 'no-match' };
  assert.is(thread.meta.pendingLength, 0);

  repeat(4, (step) => {
    thread.postMessage(action);
    assert.is(thread.meta.pendingLength, step);
  });

  thread.postMessage(action);
  assert.is(thread.meta.pendingLength, 4);
  assert.is(thread.meta.queueLength, 1);
});

test('Queues messages that exceed concurrency threshold', async ({ thread }) => {
  repeat(6, () => thread.postMessage({ name: 'no-match' }));

  assert.is(thread.meta.pendingLength, 4);
  assert.is(thread.meta.queueLength, 2);
});

test('Sends queued messages once within concurrency threshold', async ({ thread }) => {
  thread.postMessage({ name: 'no-match' });
  thread.postMessage({ name: 'no-match' });
  thread.postMessage({ name: 'no-match' });
  const sleepTask = thread.postMessage({ name: 'sleep', payload: 0 });
  thread.postMessage({ name: 'hello', payload: 'red-sworn-diameter' });
  assert.is(thread.meta.pendingLength, 4);
  assert.is(thread.meta.queueLength, 1);
  await sleepTask;
  assert.is(thread.meta.pendingLength, 4);
  assert.is(thread.meta.queueLength, 0);
});

test('Uses concurrency option when specified', async () => {
  const thread = new Thread(createWorker, { maxConcurrentMessages: 6 });

  repeat(8, () => thread.postMessage({ name: 'no-match' }));

  assert.is(thread.meta.pendingLength, 6);
  assert.is(thread.meta.queueLength, 2);
  thread.terminate();
});

test.run();
