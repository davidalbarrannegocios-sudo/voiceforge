const MAX_CONCURRENT = 15;
let activeSlots = 0;
const queue: Array<() => void> = [];

function acquire(): Promise<void> {
  return new Promise((resolve) => {
    if (activeSlots < MAX_CONCURRENT) {
      activeSlots++;
      resolve();
    } else {
      queue.push(resolve);
    }
  });
}

function release() {
  activeSlots--;
  if (queue.length > 0) {
    const next = queue.shift()!;
    activeSlots++;
    next();
  }
}

export async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  await acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}
