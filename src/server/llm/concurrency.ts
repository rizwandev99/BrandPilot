export interface SerializedQueue {
  enqueue<T>(task: () => Promise<T>): Promise<T>;
}

export function createSerializedQueue(): SerializedQueue {
  let pendingPromise: Promise<unknown> = Promise.resolve();

  return {
    async enqueue<T>(task: () => Promise<T>): Promise<T> {
      // Chain the new task to the end of pendingPromise
      const currentTask = pendingPromise.then(() => task());

      // Update pendingPromise to catch errors so subsequent tasks still execute
      pendingPromise = currentTask.catch(() => {});

      return currentTask;
    },
  };
}
