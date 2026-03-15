interface DevTimingEntry {
  at: string;
  detail?: string;
  durationMs: number;
  label: string;
}

type GlobalWithDevTimings = typeof globalThis & {
  __CRICKET247_DEV_TIMINGS__?: DevTimingEntry[];
};

function isDevTimingEnabled() {
  return process.env.NODE_ENV !== "production";
}

export async function measureDevTiming<T>(
  label: string,
  run: () => Promise<T>,
  detail?: string
) {
  if (!isDevTimingEnabled()) {
    return await run();
  }

  const startedAt = performance.now();

  try {
    return await run();
  } finally {
    const timingStore = globalThis as GlobalWithDevTimings;
    const durationMs = Number((performance.now() - startedAt).toFixed(2));

    timingStore.__CRICKET247_DEV_TIMINGS__ ??= [];
    timingStore.__CRICKET247_DEV_TIMINGS__.push({
      at: new Date().toISOString(),
      detail,
      durationMs,
      label,
    });
  }
}
