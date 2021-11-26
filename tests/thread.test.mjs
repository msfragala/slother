import './lib/setup/main-thread.mjs';
import { test, suite } from 'uvu';
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
  repeat(3, () => thread.postMessage({ name: 'no-match' }));
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

test('Thread::postMessage — Resolves to worker response', async ({ thread }) => {
  const response = await thread.postMessage({ name: 'hello', payload: '1k#9d8' });
  assert.is(response, 'Hello, 1k#9d8');
});

test('Thread::postMessage — Rejects with caught error', async ({ thread }) => {
  try {
    await thread.postMessage({ name: 'error' });
  } catch (error) {
    assert.instance(error, Error);
    assert.is(error.message, 'Fake error');
  }
});

test('Thread.proxy — Exposes thread with `self` property', async () => {
  const proxy = Thread.proxy(createWorker);
  assert.instance(proxy.self, Thread);
  await proxy.self.terminate();
});

test('Thread.proxy — Proxies methods as messages to send', async () => {
  const proxy = Thread.proxy(createWorker);
  const response = await proxy.hello('D$09da#@');
  assert.is(response, 'Hello, D$09da#@');
  await proxy.self.terminate();
});

test.run();
