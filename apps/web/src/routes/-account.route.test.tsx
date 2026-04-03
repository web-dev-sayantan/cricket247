import { beforeEach, describe, expect, it, mock } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import {
  act,
  fireEvent,
  type RenderResult,
  render,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";

const DELETE_ACCOUNT_BUTTON_PATTERN = /delete account/i;
const DELETE_ACCOUNT_DIALOG_PATTERN = /delete account\?/i;
const PLAYER_DATA_RETAINED_PATTERN =
  /your linked player profile and related cricket records will not be deleted/i;

const deleteUser = mock(async () => ({
  error: {
    message: "Deletion failed",
  },
}));

const toastError = mock(() => undefined);

const sessionState = {
  data: {
    user: {
      role: "user",
    },
  },
};

const onboardingStatusState = {
  data: {
    hasLinkedPlayer: true,
    linkedPlayer: {
      id: 11,
      name: "Aarav Rao",
    },
    onboardingCompletedAt: Date.now(),
    onboardingSeenAt: Date.now(),
    shouldPrompt: false,
  },
};

mock.module("@/components/account/admin-player-bulk-import-card", () => ({
  AdminPlayerBulkImportCard: () => null,
}));

mock.module("@/components/header", () => ({
  default: () => null,
}));

mock.module("@/lib/auth-client", () => ({
  authClient: {
    deleteUser,
    getSession: async () => sessionState,
    useSession: () => sessionState,
  },
}));

mock.module("@tanstack/react-devtools", () => ({
  TanStackDevtools: () => null,
}));

mock.module("@tanstack/react-form-devtools", () => ({
  FormDevtoolsPanel: () => null,
}));

mock.module("@tanstack/react-query-devtools", () => ({
  ReactQueryDevtoolsPanel: () => null,
}));

mock.module("@tanstack/react-router-devtools", () => ({
  TanStackRouterDevtoolsPanel: () => null,
}));

mock.module("sonner", () => ({
  Toaster: () => null,
  toast: {
    error: toastError,
    success: () => undefined,
  },
}));

mock.module("@/utils/orpc", () => ({
  client: {
    markOnboardingSeen: async () => undefined,
  },
  orpc: {
    onboardingStatus: {
      queryOptions: () => ({
        queryFn: async () => onboardingStatusState.data,
        queryKey: ["onboardingStatus"],
      }),
    },
  },
  queryClient: new QueryClient(),
}));

let routeImportNonce = 0;

async function renderRoute(initialEntry: string): Promise<RenderResult> {
  routeImportNonce += 1;

  const [{ routeTree }, { client, orpc }] = await Promise.all([
    import(`@/routeTree.gen?accountRouteTest=${routeImportNonce}`),
    import(`@/utils/orpc?accountRouteTest=${routeImportNonce}`),
  ]);

  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: [initialEntry],
    }),
    context: { client, orpc, queryClient },
    Wrap({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    },
  });

  await act(async () => {
    await router.load();
  });

  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  deleteUser.mockClear();
  toastError.mockClear();
});

describe("account route", () => {
  it("asks for confirmation before deleting the account", async () => {
    const screen = await renderRoute("/account");
    const deleteAccountButton = await screen.findByRole("button", {
      name: DELETE_ACCOUNT_BUTTON_PATTERN,
    });

    fireEvent.click(deleteAccountButton);

    expect(
      await screen.findByRole("heading", {
        name: DELETE_ACCOUNT_DIALOG_PATTERN,
      })
    ).toBeTruthy();
    expect(screen.getByText(PLAYER_DATA_RETAINED_PATTERN)).toBeTruthy();
  });

  it("submits the delete request from the confirmation dialog", async () => {
    const screen = await renderRoute("/account");
    const deleteAccountButton = await screen.findByRole("button", {
      name: DELETE_ACCOUNT_BUTTON_PATTERN,
    });

    fireEvent.click(deleteAccountButton);

    const dialog = await screen.findByRole("dialog");

    fireEvent.click(
      within(dialog).getAllByRole("button", {
        name: DELETE_ACCOUNT_BUTTON_PATTERN,
      })[0]
    );

    await waitFor(() => {
      expect(deleteUser).toHaveBeenCalledTimes(1);
      expect(toastError).toHaveBeenCalledWith("Deletion failed");
    });
  });
});
