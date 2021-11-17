import { Thread } from ".";
import type { Action, WorkerImport } from "./thread";
import { createNanoEvents, Unsubscribe } from "nanoevents";

type PoolEvent = {
  [key: `message:${string}`]: (payload: unknown) => void;
  [key: `error:${string}`]: (error: unknown) => void;
};

interface QueuedAction {
  id: number;
  action: Action;
}

interface PoolOptions {
  concurrentThreads: number;
  concurrentTasks: number;
}

export interface Pool {
  new (importWorker: WorkerImport, options?: Partial<PoolOptions>): Pool;
}

export class Pool {
  #actionCount = 0;
  #importWorker: WorkerImport;
  #concurrentThreads: number;
  #concurrentTasks: number;
  #threads: Thread[] = [];
  #queue: QueuedAction[] = [];
  #emitter = createNanoEvents<PoolEvent>();

  constructor(importWorker: WorkerImport, options?: Partial<PoolOptions>) {
    this.#importWorker = importWorker;
    this.#concurrentThreads = options?.concurrentThreads ?? 12;
    this.#concurrentTasks = options?.concurrentTasks ?? 2;
  }

  dispatch(action: Action): Promise<unknown> {
    const id = ++this.#actionCount;
    this.#queue.push({ id, action });
    this.#scheduleAction();
    return this.#waitForTask(id);
  }

  #scheduleAction() {
    const item = this.#queue.shift();

    if (!item) return;

    let thread = this.#threads.find((t) => t.available());
    thread ??= this.#spawnThread();

    if (!thread) return;

    const { id, action } = item;

    thread
      .dispatch(action)
      .then((payload) => {
        this.#emitter.emit(`message:${id}`, payload);
      })
      .catch((error) => {
        this.#emitter.emit(`error:${id}`, error);
      })
      .finally(() => {
        this.#scheduleAction();
      });
  }

  #spawnThread() {
    if (this.#threads.length >= this.#concurrentThreads) return;

    const thread = new Thread(this.#importWorker, {
      concurrency: this.#concurrentTasks,
    });

    this.#threads.push(thread);
    return thread;
  }

  #waitForTask(id: number): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let unMessage: Unsubscribe;
      let unError: Unsubscribe;

      unMessage = this.#emitter.on(`message:${id}`, (payload) => {
        resolve(payload);
        unMessage?.();
        unError?.();
      });

      unError = this.#emitter.on(`error:${id}`, (error) => {
        reject(error);
        unMessage?.();
        unError?.();
      });
    });
  }
}
