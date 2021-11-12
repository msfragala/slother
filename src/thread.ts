type WorkerImport = () => Promise<Worker>;

interface Task {
  id: number;
  type: string;
  payload: any;
  transfer?: Transferable[];
}

interface Action {
  type: string;
  payload: any;
  transfer?: Transferable[];
}

interface ThreadOptions {
  concurrency?: number;
}

export class Thread {
  #taskCount: number = 0;
  #importWorker: WorkerImport;
  #worker: Promise<Worker>;
  #concurrency: number;
  #queue: Task[] = [];
  #pending: number[] = [];

  constructor(importWorker: WorkerImport, options: Partial<ThreadOptions>) {
    this.#concurrency = options.concurrency ?? 4;
    this.#importWorker = importWorker;
  }

  worker() {
    this.#worker ??= this.#importWorker();
    return this.#worker;
  }

  dispatch(action: Action): Promise<unknown> {
    const id = ++this.#taskCount;
    this.#queue.push({ id, ...action });
    this.#scheduleTask();
    return this.#waitForTask(id).then((data) => {
      remove(this.#pending, id);
      this.#scheduleTask();
      return data;
    });
  }

  async #waitForTask(id: number): Promise<unknown> {
    const worker = await this.worker();
    return new Promise((resolve, reject) => {
      worker.addEventListener("message", function listener(event) {
        if (event?.data?.id !== id) return;
        if (event.data.error) reject(event.data.error);
        else resolve(event.data.payload);
        worker.removeEventListener("message", listener);
      });
    });
  }

  async #scheduleTask() {
    if (this.#pending.length >= this.#concurrency) return;
    if (this.#queue.length === 0) return;

    const { transfer, ...task } = this.#queue.shift();
    this.#pending.push(task.id);

    const worker = await this.worker();
    worker.postMessage(task, transfer);
  }
}

function remove<T>(array: T[], item: T) {
  const i = array.indexOf(item);
  if (i > -1) array.splice(i, 1);
}
