import { beforeEach, describe, expect, it, mock } from "bun:test";
import { renderHook, waitFor } from "@testing-library/react";

const queryOptionsMock = mock(
  ({
    input,
  }: {
    input: string;
  }): { queryKey: readonly ["teams", string]; staleTime: number } => ({
    queryKey: ["teams", input] as const,
    staleTime: 1000,
  })
);

let lastUseQueryOptions:
  | ({ queryKey: readonly ["teams", string]; staleTime: number } & {
      enabled: boolean;
    })
  | null = null;

const useQueryMock = mock(
  (
    options: { queryKey: readonly ["teams", string]; staleTime: number } & {
      enabled: boolean;
    }
  ): { data: string[]; isLoading: boolean; error: null } => {
    lastUseQueryOptions = options;
    return {
      data: [],
      isLoading: false,
      error: null,
    };
  }
);

mock.module("@/utils/orpc", () => ({
  orpc: {
    searchTeamsByName: {
      queryOptions: queryOptionsMock,
    },
  },
}));

mock.module("@tanstack/react-query", () => ({
  useQuery: useQueryMock,
}));

const useTeamSearchModulePromise = import("./use-team-search");

describe("useTeamSearch", () => {
  beforeEach(() => {
    queryOptionsMock.mockClear();
    useQueryMock.mockClear();
    lastUseQueryOptions = null;
  });

  it("trims non-empty input before calling queryOptions after debounce", async () => {
    const { useTeamSearch } = await useTeamSearchModulePromise;

    renderHook(() => useTeamSearch("  Mumbai Indians  ", 25));

    await waitFor(() => {
      expect(queryOptionsMock).toHaveBeenCalledWith({
        input: "Mumbai Indians",
      });
    });

    expect(lastUseQueryOptions?.enabled).toBe(true);
  });

  it("sets enabled to false for empty or whitespace-only input", async () => {
    const { useTeamSearch } = await useTeamSearchModulePromise;

    renderHook(() => useTeamSearch("   ", 25));

    await waitFor(() => {
      expect(queryOptionsMock).toHaveBeenCalledWith({ input: "" });
    });

    expect(lastUseQueryOptions?.enabled).toBe(false);
  });
});
