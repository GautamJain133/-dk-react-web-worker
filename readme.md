# WorkerPool

WorkerPool is a JavaScript class that manages a pool of Web Workers, allowing for efficient distribution and execution of tasks across multiple threads.

## Features

- Dynamic creation and management of Web Workers
- Task queuing and distribution
- Automatic garbage collection for idle workers
- Error handling for worker tasks
- Customizable pool size and idle timeout

## Installation

To use WorkerPool in your project, you can simply copy the `WorkerPool.js` file into your project directory.

```bash
cp WorkerPool.js /path/to/your/project/

Usage
Here's a basic example of how to use WorkerPool:

import WorkerPool from './WorkerPool.js';

// Create a WorkerPool instance
const pool = new WorkerPool(YourWorkerScript, 5, 300000);

// Start the garbage collector
pool.startGarbageCollector();

// Run a task
try {
  const result = await pool.runTask(someData);
  console.log(result);
} catch (error) {
  console.error('Task failed:', error);
}

// When you're done with the pool, terminate all workers
pool.terminateAll();

Using with React (Custom Hook)
You can create a custom React hook to use WorkerPool in your React applications:


import React, { useState, useEffect } from "react";
import WorkerPool from "./WorkerPool.js";

function useWorkerPool(workerFile, threadCount) {
  const [pool, setPool] = useState(null);

  useEffect(() => {
    const newPool = new WorkerPool(workerFile, threadCount, 60000);
    newPool.startGarbageCollector();
    setPool(newPool);
    return () => {
      // Clean up the worker pool when the component unmounts
      if (newPool) {
        newPool.terminateAll();
      }
    };
  }, [workerFile, threadCount]);

  return pool;
}

export default useWorkerPool;