# react-web-worker-agc

A powerful and efficient Web Worker manager for React applications.

## Description

`react-web-worker-agc` is a npm package that provides a robust solution for managing Web Workers in React applications. It offers a `WorkerPool` class that allows you to create, manage, and optimize the use of Web Workers, enabling better performance for CPU-intensive tasks in your React applications.

## Features

- Create and manage a pool of Web Workers
- Automatic task queuing and distribution
- Idle worker termination for optimized resource usage
- Easy integration with React components through a custom hook
- Garbage collection to clean up idle workers

## Installation

Install the package using npm:

```bash
npm install react-web-worker-agc

Or using yarn:

Usage

Basic Usage

import { WorkerPool } from 'react-web-worker-agc';

// Create a WorkerPool instance
const pool = new WorkerPool(YourWorkerScript, 5, 300000);

// Start the garbage collector
pool.startGarbageCollector();

// Run a task
const result = await pool.runTask(someData);

// When done, terminate all workers
pool.terminateAll();


Using with React Custom Hook

import React, { useState, useEffect } from "react";
import { WorkerPool } from "react-web-worker-agc";

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
```

## API Reference

- WorkerPool

## Constructor

- new WorkerPool(workerScript, maxWorkers = 3, idleTimeout = 120000)

- workerScript: The Web Worker script to be used
- maxWorkers: Maximum number of workers in the pool (default: 3)
- idleTimeout: Time in milliseconds before an idle worker is terminated (default: 120000)

## Methods

- runTask(data): Submits a task to be processed by a Web Worker
- startGarbageCollector(): Starts the garbage collector to clean up idle workers
- stopGarbageCollector(): Stops the garbage collector
- terminateAll(): Terminates all workers and clears the poo

## Contributing

- Contributions are welcome! Please feel free to submit a Pull Request.

## License

- This project is licensed under the ISC License.

## Support

- If you encounter any problems or have any questions, please open an issue on the GitHub repository.

## Author

Gautam Jain
