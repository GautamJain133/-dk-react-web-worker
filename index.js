 export class WorkerPool {
  /**
   *
   * @param {*} workerScript
   * @param {int} maxWorkers
   * @param {millisecond} idleTimeout
   */
  constructor(workerScript, maxWorkers = 3, idleTimeout = 120 * 1000) {
    this.workerScript = workerScript; // script in which task is written
    this.maxWorkers = maxWorkers; // max worker that can be instantiated to do task
    this.workers = []; // store the created worker
    this.queue = []; // store the pending task need to be processed by worker
    this.activeTasks = new Map(); // store the currently active task ( busy in doing work)
    this.taskIdCounter = 0; // unique id of each task assign to the worker
    this.idleTimeout = idleTimeout; // the ideal time for terminate the stale worker
    this.workerLastUsed = new Map(); // last time when worker perform some task
    this.garbageCollectorInterval = null; // property for GC interval
  }
  /**
   * Retrieves an available Web Worker. If the number of current workers is less than the maximum allowed,
   * a new worker is created, event listeners are set up, and it is added to the pool.
   * The worker's last used time is also recorded.
   *
   * If the maximum number of workers has been reached, an existing worker is selected randomly from the pool.
   * The selected worker's last used time is updated.
   *
   * @returns {Worker} - A new or existing Web Worker.
   */
  getWorker() {
    if (this.workers.length < this.maxWorkers) {
      const worker = new this.workerScript();
      this.setupWorkerEventListeners(worker);
      this.workers.push(worker);
      this.workerLastUsed.set(worker, Date.now()); // Track last used time
      return worker;
    }
    const worker =
      this.workers[Math.floor(Math.random() * this.workers.length)];
    this.workerLastUsed.set(worker, Date.now()); // Update last used time
    return worker;
  }

  /**
   * Sets up event listeners for the provided Web Worker.
   *
   * The 'onmessage' event is bound to handle incoming messages from the worker,
   * and the 'onerror' event is bound to handle any errors that occur in the worker.
   *
   * @param {Worker} worker - The Web Worker for which to set up event listeners.
   */
  setupWorkerEventListeners(worker) {
    worker.onmessage = this.handleWorkerMessage.bind(this);
    worker.onerror = this.handleWorkerError.bind(this);
  }

  /**
   * Handles messages received from a Web Worker. The message contains a task ID and result data.
   *
   * The task is retrieved from the active tasks based on the task ID. If the task exists, its promise is resolved
   * with the result, the task is removed from the active task list, and the queue is processed for doing the remaining tasks.
   *
   * If no task is found for the given task ID, a warning is logged to the console.
   *
   * @param {MessageEvent} event - The message event received from the worker, containing task data.
   */

  handleWorkerMessage(event) {
    const { taskId, result } = event.data;
    const task = this.activeTasks.get(taskId);
    if (task) {
      task.resolve(result);
      this.activeTasks.delete(taskId);
      this.processQueue();
    } else {
      console.warn(`Received result for unknown task ID: ${taskId}`);
    }
  }

  /**
   * Handles errors encountered by the Web Worker.
   *
   * Since it's not possible to determine which specific task caused the error, all active tasks are rejected
   * with a generic error message. Each task is removed from the active tasks list, and the queue is then processed.
   *
   * @param {ErrorEvent} error - The error event received from the worker.
   */
  handleWorkerError(error) {
    // Reject all active tasks as we can't determine which task caused the error
    for (let [taskId, task] of this.activeTasks) {
      task.reject(new Error("Worker encountered an error"));
      this.activeTasks.delete(taskId);
    }
    this.processQueue();
  }

  /**
   * Submits a task to be processed by a Web Worker.
   *
   * The task is wrapped in a promise, allowing the caller to handle the task asynchronously.
   * A unique task ID is generated and the task, along with its data, resolve, and reject handlers,
   * is added to the task queue. The task queue is then processed.
   *
   * @param {*} data - The data to be processed by the Web Worker.
   * @returns {Promise} - A promise that resolves with the result of the task or rejects if an error occurs.
   */
  async runTask(data) {
    return new Promise((resolve, reject) => {
      const taskId = this.taskIdCounter++;
      const task = { id: taskId, data, resolve, reject };
      this.queue.push(task);
      this.processQueue();
    });
  }

  /**
   * Processes the task queue by assigning tasks to available Web Workers.
   *
   * While there are tasks in the queue and the number of active tasks is less than the maximum allowed workers,
   * tasks are removed from the queue (FIFO) and sent to a Web Worker for execution. The task is then processed
   * using the `runTaskOnWorker` function.
   */
  processQueue() {
    while (this.queue.length > 0 && this.activeTasks.size < this.maxWorkers) {
      const task = this.queue.shift();
      this.runTaskOnWorker(task);
    }
  }
  /**
   * Assigns a task to a Web Worker for execution.
   *
   * Retrieves an available Web Worker from the worker pool and assigns the task to it.
   * The task is added to the active tasks list, and the worker is instructed to begin processing
   * the task by posting a message that includes the task ID and task data.
   *
   * @param {Object} task - The task to be executed by the worker, containing the task ID and data.
   */
  runTaskOnWorker(task) {
    const worker = this.getWorker();
    this.activeTasks.set(task.id, task);

    worker.postMessage({ taskId: task.id, data: task.data });
  }

  /**
   * Starts the garbage collector to clean up idle Web Workers.
   *
   * If a garbage collection interval is already running, it is cleared to avoid duplicate intervals.
   * A new interval is set to run the garbage collection process periodically. The interval runs at half
   * the configured idle timeout value to check for and terminate idle workers.
   *
   * @remarks The `collectGarbage` function is called periodically to clean up workers that have been idle
   * for too long.
   */

  startGarbageCollector() {
    if (this.garbageCollectorInterval) {
      clearInterval(this.garbageCollectorInterval);
    }
    this.garbageCollectorInterval = setInterval(() => {
      this.collectGarbage();
    }, this.idleTimeout / 2);
  }

  /**
   * Stops the garbage collector for Web Workers.
   *
   * If the garbage collection interval is running, it is cleared to stop further executions of the garbage
   * collection process. The `garbageCollectorInterval` reference is then set to `null` to indicate that
   * the garbage collector is no longer active.
   */

  stopGarbageCollector() {
    if (this.garbageCollectorInterval) {
      clearInterval(this.garbageCollectorInterval);
      this.garbageCollectorInterval = null;
    }
  }

  /**
   * Cleans up idle Web Workers that have exceeded the allowed idle timeout.
   *
   * Iterates through the pool of workers and checks their last used timestamp. Workers that have been idle
   * longer than the specified `idleTimeout` and are not the only worker remaining are terminated. These workers
   * are then removed from the pool, and their last used time entries are deleted.
   *
   * Workers that are still active or within the allowed idle period remain in the pool.
   */

  collectGarbage() {
    const now = Date.now();
    this.workers = this.workers.filter((worker) => {
      const lastUsed = this.workerLastUsed.get(worker);
      if (now - lastUsed > this.idleTimeout && this.workers.length > 1) {
        worker.terminate();
        this.workerLastUsed.delete(worker);
        return false;
      }
      return true;
    });
  }
  /**
   * Terminates all active Web Workers and clears all internal data structures.
   *
   * The garbage collector is stopped first to prevent any further cleanup actions. Each worker in the pool has
   * its message and error event handlers removed and is then terminated. All active workers, tasks, the task queue,
   * and last used time entries are cleared, resetting the worker pool to an empty state.
   */
  terminateAll() {
    this.stopGarbageCollector();
    this.workers.forEach((worker) => {
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
    });
    this.workers = [];
    this.activeTasks.clear();
    this.queue = [];
    this.workerLastUsed.clear();
  }
}

export default WorkerPool;

/*
1. Create a WorkerPool instance:
     const pool = new WorkerPool(YourWorkerScript, 5, 300000);
 
 2. Start the garbage collector:
      pool.startGarbageCollector();
 
 
 3.  Use the pool as before:
       const result = await pool.runTask(someData);
   
  4. When you're done with the pool, terminate all workers:
      pool.terminateAll();
 
 
 
  example using react custom hook
 
 
import React, { useState, useEffect } from "react";
import WorkerPool from "react-worker-pool"
function useWorkerPool(workerFile, threadCount) {
  const [pool, setPool] = useState(null);
 
  useEffect(() => {
    const newPool = new WorkerPool(workerFile, threadCount, 60000);
    newPool.startGarbageCollector();
    setPool(newPool);
    return () => {
      // Clean up the worker pool when the component unmounts
      if (newPool) {
        newPool && newPool.terminateAll();
      }
    };
  }, [workerFile, threadCount]);
  return pool;
}
 
export default useWorkerPool;
 
 
*/
