import './lib/setup/main-thread.mjs';
import { test, suite } from 'uvu';
import * as assert from 'uvu/assert';
import { Pool } from '../dist/slother.mjs';
import { resolve } from 'node:path';
import { repeat } from './lib/repeat.mjs';
import { createWorker } from './lib/create-worker.mjs';

test.before.each(($) => {
  $.pool = new Pool(createWorker);
});

test.after.each(async ($) => {
  await $.pool.terminate();
});

test('Does not create threads until posting message', async ({ pool }) => {
  assert.is(pool.meta.threads.length, 0);
  pool.postMessage({ name: 'nomatch' });
  assert.is(pool.meta.threads.length, 1);
});

test('Reuses threads within concurrency limit', async ({ pool }) => {
  repeat(4, () => pool.postMessage({ name: 'nomatch' }));

  assert.is(pool.meta.threads.length, 1);
});

test('Spawns new thread when others at limit', async ({ pool }) => {
  repeat(4, () => pool.postMessage({ name: 'nomatch' }));

  assert.is(pool.meta.threads.length, 1);

  pool.postMessage({ name: 'nomatch' });
  assert.is(pool.meta.threads.length, 2);
});

test('Queues messages when all threads at limit', async ({ pool }) => {
  repeat(12 * 4, () => {
    pool.postMessage({ name: 'nomatch' });
    assert.is(pool.meta.queueLength, 0);
  });

  pool.postMessage({ name: 'nomatch' });
  assert.is(pool.meta.queueLength, 1);
});

test('Posts queued messages when a thread is idle', async ({ pool }) => {
  repeat(12 * 4 - 1, () => pool.postMessage({ name: 'nomatch' }));

  const sleepTask = pool.postMessage({ name: 'sleep', payload: 0 });
  pool.postMessage({ name: 'nomatch' });
  assert.is(pool.meta.queueLength, 1);
  await sleepTask;
  assert.is(pool.meta.queueLength, 0);
});

test('Pool::postMessage resolves to worker response', async ({ pool }) => {
  const response = await pool.postMessage({ name: 'hello', payload: '1k#9d8' });
  assert.is(response, 'Hello, 1k#9d8');
});

test('Pool::postMessage rejects with caught error', async ({ pool }) => {
  try {
    await pool.postMessage({ name: 'error' });
  } catch (error) {
    assert.instance(error, Error);
    assert.is(error.message, 'Fake error');
  }
});

test('Pool.proxy — Exposes pool with `self` property', async () => {
  const proxy = Pool.proxy(createWorker);
  assert.instance(proxy.self, Pool);
  await proxy.self.terminate();
});

test('Pool.proxy — Proxies methods as messages to send', async () => {
  const proxy = Pool.proxy(createWorker);
  const response = await proxy.hello('D$09da#@');
  assert.is(response, 'Hello, D$09da#@');
  await proxy.self.terminate();
});

test.run();
