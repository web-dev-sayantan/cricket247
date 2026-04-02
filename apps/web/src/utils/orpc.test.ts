import { describe, expect, it, mock } from "bun:test";

const toastError = mock(() => undefined);

function registerSonnerMock() {
  mock.module("sonner", () => ({
    Toaster: () => null,
    toast: {
      error: toastError,
    },
  }));
}

let orpcImportNonce = 0;

async function importOrpcModule() {
  registerSonnerMock();
  orpcImportNonce += 1;
  return await import(`./orpc?orpcTest=${orpcImportNonce}`);
}

describe("orpc client helpers", () => {
  it("does not retry rate-limited requests", async () => {
    const { shouldRetryOrpcRequest } = await importOrpcModule();

    expect(
      shouldRetryOrpcRequest(
        0,
        Object.assign(new Error("Too many requests"), {
          data: { retryAfter: 3 },
          status: 429,
        })
      )
    ).toBe(false);
  });

  it("formats a helpful rate-limit toast message", async () => {
    const { getOrpcErrorToastMessage } = await importOrpcModule();

    expect(
      getOrpcErrorToastMessage(
        Object.assign(new Error("Too many requests"), {
          data: { retryAfter: 3 },
          status: 429,
        })
      )
    ).toBe("Rate limit exceeded. Try again in 3s.");
  });

  it("keeps retrying non-rate-limited query errors within the default budget", async () => {
    const { shouldRetryOrpcRequest } = await importOrpcModule();

    expect(shouldRetryOrpcRequest(0, new Error("Network error"))).toBe(true);
    expect(shouldRetryOrpcRequest(3, new Error("Network error"))).toBe(false);
  });
});
