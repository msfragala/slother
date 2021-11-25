import { Thread } from '.';
import type { Action, Message, ThreadMeta, WorkerImport } from './thread';

type MessageListener = (data: { payload?: any; error?: any }) => void;

interface PoolOptions {
  maxConcurrentThreads: number;
  maxConcurrentMessages: number;
}

interface PoolMeta {
  threads: ThreadMeta[];
  queueLength: number;
  maxConcurrentThreads: number;
  maxConcurrentMessages: number;
}

export interface Pool {
  new (importWorker: WorkerImport, options?: Partial<PoolOptions>): Pool;
  terminate(): Promise<void>;
  postMessage(action: Action, transfer?: Transferable[]): Promise<unknown>;
}

export class Pool {
  #actionCount = 0;
  #importWorker: WorkerImport;
  #maxConcurrentThreads: number;
  #maxConcurrentMessages: number;
  #threads: Thread[] = [];
  #queue: Message[] = [];
  #listeners: Record<number, MessageListener> = {};

  constructor(importWorker: WorkerImport, options?: Partial<PoolOptions>) {
    this.#importWorker = importWorker;
    this.#maxConcurrentThreads = options?.maxConcurrentThreads ?? 12;
    this.#maxConcurrentMessages = options?.maxConcurrentMessages ?? 4;
  }

  get meta(): PoolMeta {
    return {
      threads: this.#threads.map((t) => t.meta),
      queueLength: this.#queue.length,
      maxConcurrentThreads: this.#maxConcurrentThreads,
      maxConcurrentMessages: this.#maxConcurrentMessages,
    };
  }

  postMessage(action: Action, transfer?: Transferable[]): Promise<unknown> {
    const id = ++this.#actionCount;
    this.#queue.push({ id, action, transfer });
    this.#scheduleAction();
    return new Promise((resolve, reject) => {
      this.#listeners[id] = ({ payload, error }) => {
        this.#scheduleAction();
        if (error) reject(error);
        else resolve(payload);
      };
    });
  }

  #scheduleAction() {
    if (this.#queue.length === 0) return;

    let thread = this.#threads.find((t) => t.available());
    thread ??= this.#spawnThread();

    if (!thread) return;

    const task = this.#queue.shift();

    if (!task) return;

    const { id, action, transfer } = task;

    thread
      .postMessage(action, transfer)
      .then((payload) => {
        this.#listeners[id]?.({ payload });
        delete this.#listeners[id];
      })
      .catch((error) => {
        this.#listeners[id]?.({ error });
        delete this.#listeners[id];
      })
      .finally(() => {
        this.#scheduleAction();
      });
  }

  #spawnThread() {
    if (this.#threads.length >= this.#maxConcurrentThreads) return;

    const thread = new Thread(this.#importWorker, {
      maxConcurrentMessages: this.#maxConcurrentMessages,
    });

    this.#threads.push(thread);
    return thread;
  }

  async terminate() {
    await Promise.all(this.#threads.map((thread) => thread.terminate()));
  }
}
