import { Thread } from ".";
import type { Action, WorkerImport } from "./thread";
import mitt from "mitt";

type PoolEvent = {
  message: { id: number; payload: unknown };
  error: { id: number; error: unknown };
};

interface QueuedAction {
  id: number;
  action: Action;
}

interface PoolOptions {
  concurrentThreads: number;
  concurrentTasks: number;
}

export class Pool {
  #actionCount = 0;
  #importWorker: WorkerImport;
  #concurrentThreads: number;
  #concurrentTasks: number;
  #threads: Thread[] = [];
  #queue: QueuedAction[] = [];
  #mitt = mitt<PoolEvent>();

  constructor(importWorker: WorkerImport, options: Partial<PoolOptions>) {
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
    if (this.#queue.length === 0) return;

    let thread = this.#threads.find((t) => t.available());
    thread ??= this.#spawnThread();

    if (!thread) return;

    const { id, action } = this.#queue.shift();
    thread
      .dispatch(action)
      .then((payload) => {
        this.#mitt.emit("message", { id, payload });
      })
      .catch((error) => {
        this.#mitt.emit("error", { id, error });
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
    const self = this;
    return new Promise((resolve, reject) => {
      this.#mitt.on("message", function listener(event) {
        if (event.id !== id) return;
        resolve(event.payload);
        self.#mitt.off("message", listener);
      });

      this.#mitt.on("error", function listener(event) {
        if (event.id !== id) return;
        reject(event.error);
        self.#mitt.off("error", listener);
      });
    });
  }
}
