/**
 * Semaphore implementation for controlling concurrent operations
 */
export class Semaphore {
  private available: number;
  private maxConcurrency: number;
  private waitQueue: Array<() => void> = [];

  constructor(maxConcurrency: number = 20) {
    if (maxConcurrency < 1 || maxConcurrency > 1000) {
      throw new Error('maxConcurrency must be between 1 and 1000');
    }
    this.maxConcurrency = maxConcurrency;
    this.available = maxConcurrency;
  }

  /**
   * Acquire a slot. Returns a promise that resolves when a slot is available.
   * The returned function must be called to release the slot.
   */
  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (this.available > 0) {
        this.available--;
        resolve(() => this.release());
      } else {
        this.waitQueue.push(() => {
          this.available--;
          resolve(() => this.release());
        });
      }
    });
  }

  /**
   * Release a slot and notify the next waiting task if any
   */
  private release(): void {
    this.available++;
    if (this.available > this.maxConcurrency) {
      this.available = this.maxConcurrency;
    }

    // Notify next waiting task
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      if (next) {
        next();
      }
    }
  }

  /**
   * Get current number of available slots
   */
  getAvailable(): number {
    return this.available;
  }

  /**
   * Get current number of waiting tasks
   */
  getWaiting(): number {
    return this.waitQueue.length;
  }

  /**
   * Get the maximum concurrency limit
   */
  getMaxConcurrency(): number {
    return this.maxConcurrency;
  }
}

