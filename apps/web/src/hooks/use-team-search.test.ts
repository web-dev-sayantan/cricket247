import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";

const queryOptionsMock = mock(
  ({
    input,
  }: {
    input: string;
  }): {
    queryFn: () => Promise<string[]>;
    queryKey: readonly ["teams", string];
    staleTime: number;
  } => ({
    queryFn: queryFnMock,
    queryKey: ["teams", input] as const,
    staleTime: 1000,
  })
);

const queryFnMock = mock(async (): Promise<string[]> => []);

let useTeamSearchImportNonce = 0;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };
}

function loadUseTeamSearchModule() {
  mock.module("@/utils/orpc", () => ({
    orpc: {
      searchTeamsByName: {
        queryOptions: queryOptionsMock,
      },
    },
  }));

  useTeamSearchImportNonce += 1;
  return import(`./use-team-search?test=${useTeamSearchImportNonce}`);
}

describe("useTeamSearch", () => {
  beforeEach(() => {
    mock.restore();
    queryOptionsMock.mockClear();
    queryFnMock.mockClear();
  });

  afterEach(() => {
    mock.restore();
  });

  it("trims non-empty input before calling queryOptions after debounce", async () => {
    const { useTeamSearch } = await loadUseTeamSearchModule();

    renderHook(() => useTeamSearch("  Mumbai Indians  ", 25), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(queryOptionsMock).toHaveBeenCalledWith({
        input: "Mumbai Indians",
      });
    });

    await waitFor(() => {
      expect(queryFnMock).toHaveBeenCalled();
    });
  });

  it("sets enabled to false for empty or whitespace-only input", async () => {
    const { useTeamSearch } = await loadUseTeamSearchModule();

    renderHook(() => useTeamSearch("   ", 25), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(queryOptionsMock).toHaveBeenCalledWith({ input: "" });
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(queryFnMock).not.toHaveBeenCalled();
  });
});
