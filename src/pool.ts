import { Thread } from ".";
import type { Action, Message, WorkerImport } from "./thread";
import { createNanoEvents, Unsubscribe } from "nanoevents";

type PoolEvent = {
  [key: `message:${string}`]: (payload: unknown) => void;
  [key: `error:${string}`]: (error: unknown) => void;
};

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
  #queue: Message[] = [];
  #emitter = createNanoEvents<PoolEvent>();

  constructor(importWorker: WorkerImport, options?: Partial<PoolOptions>) {
    this.#importWorker = importWorker;
    this.#concurrentThreads = options?.concurrentThreads ?? 12;
    this.#concurrentTasks = options?.concurrentTasks ?? 2;
  }

  postMessage(action: Action, transfer?: Transferable[]): Promise<unknown> {
    const id = ++this.#actionCount;
    this.#queue.push({ id, action, transfer });
    this.#scheduleAction();
    return this.#waitForTask(id);
  }

  #scheduleAction() {
    const task = this.#queue.shift();

    if (!task) return;

    let thread = this.#threads.find((t) => t.available());
    thread ??= this.#spawnThread();

    if (!thread) return;

    const { id, action, transfer } = task;

    thread
      .postMessage(action, transfer)
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
