export type WorkerImport = () => Promise<Worker> | Worker;

export interface Action {
  name: string;
  payload: any;
}

export interface Message {
  id: number;
  action: Action;
  transfer?: Transferable[];
}

export interface ThreadMeta {
  workerCreated: boolean;
  queueLength: number;
  pendingLength: number;
}

interface ThreadOptions {
  maxConcurrentMessages?: number;
}

export interface Thread {
  new (importWorker: WorkerImport, options?: Partial<ThreadOptions>): Thread;
}

export class Thread {
  #closing: boolean = false;
  #taskCount: number = 0;
  #importWorker: WorkerImport;
  #worker?: Promise<Worker>;
  #maxConcurrentMessages: number;
  #queue: Message[] = [];
  #pending: number[] = [];

  constructor(importWorker: WorkerImport, options?: Partial<ThreadOptions>) {
    this.#maxConcurrentMessages = options?.maxConcurrentMessages ?? 4;
    this.#importWorker = importWorker;
  }

  get meta(): ThreadMeta {
    return {
      workerCreated: Boolean(this.#worker),
      queueLength: this.#queue.length,
      pendingLength: this.#pending.length,
    };
  }

  worker() {
    this.#worker ??= Promise.resolve(this.#importWorker());
    return this.#worker;
  }

  postMessage(action: Action, transfer?: Transferable[]): Promise<unknown> {
    if (this.#closing) return Promise.resolve();
    const id = ++this.#taskCount;
    this.#queue.push({ id, action, transfer });
    this.#scheduleTask();
    return this.#waitForTask(id).then((data) => {
      remove(this.#pending, id);
      this.#scheduleTask();
      return data;
    });
  }

  available(): boolean {
    return this.#pending.length < this.#maxConcurrentMessages;
  }

  terminate() {
    this.#closing = true;
    if (!this.#worker) return Promise.resolve();
    return this.#worker.then((w) => w.terminate());
  }

  async #waitForTask(id: number): Promise<unknown> {
    const worker = await this.worker();
    return new Promise((resolve, reject) => {
      worker.addEventListener('message', function listener(event) {
        if (event?.data?.id !== id) return;
        if (event.data.error) reject(event.data.error);
        else resolve(event.data.payload);
        worker.removeEventListener('message', listener);
      });
    });
  }

  async #scheduleTask() {
    if (this.#closing) return;
    if (!this.available()) return;

    const task = this.#queue.shift();

    if (!task) return;

    const { id, action, transfer } = task;

    this.#pending.push(id);

    const worker = await this.worker();
    worker.postMessage({ id, action }, transfer ?? []);
  }
}

function remove<T>(array: T[], item: T) {
  const i = array.indexOf(item);
  if (i > -1) array.splice(i, 1);
}
