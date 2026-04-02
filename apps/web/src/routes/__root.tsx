import type { AppRouterClient } from "@cricket247/server/contract";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { FormDevtoolsPanel } from "@tanstack/react-form-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import Header from "@/components/header";
import Loader from "@/components/loader";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { orpc } from "@/utils/orpc";
import "../index.css";

export interface RouterAppContext {
  client: AppRouterClient;
  orpc: typeof orpc;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "Cricket247 | Live Cricket Scores, Fixtures, and Match Updates",
      },
      {
        name: "description",
        content:
          "Follow live cricket scores, fixtures, teams, players, and match insights with Cricket247.",
      },
      {
        name: "keywords",
        content:
          "cricket, live cricket scores, cricket fixtures, cricket matches, cricket teams, cricket players",
      },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large",
      },
      {
        name: "theme-color",
        content: "#bf272c",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:title",
        content:
          "Cricket247 | Live Cricket Scores, Fixtures, and Match Updates",
      },
      {
        property: "og:description",
        content:
          "Follow live cricket scores, fixtures, teams, players, and match insights with Cricket247.",
      },
      {
        property: "og:url",
        content: "https://cricket247-web.workers.dev/",
      },
      {
        property: "og:site_name",
        content: "Cricket247",
      },
      {
        property: "og:image",
        content: "/cricket-ball.svg",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "twitter:title",
        content:
          "Cricket247 | Live Cricket Scores, Fixtures, and Match Updates",
      },
      {
        name: "twitter:description",
        content:
          "Follow live cricket scores, fixtures, teams, players, and match insights with Cricket247.",
      },
      {
        name: "twitter:image",
        content: "/cricket-ball.svg",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://cricket247-web.workers.dev/",
      },
      {
        rel: "icon",
        href: "/favicon.svg",
        type: "image/svg+xml",
      },
    ],
  }),
});

function RootComponent() {
  const isFetching = useRouterState({
    select: (s) => s.isLoading,
  });

  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        disableTransitionOnChange
        storageKey="vite-ui-theme"
      >
        <TooltipProvider>
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <div className="grid min-h-svh grid-rows-[auto_1fr]">
            <Header />
            <div className="min-h-0">
              {isFetching ? <Loader /> : <Outlet />}
            </div>
          </div>
        </TooltipProvider>
        <Toaster richColors />
      </ThemeProvider>
      <TanStackDevtools
        plugins={[
          {
            name: "Tanstack Query",
            render: <ReactQueryDevtoolsPanel />,
          },
          { name: "Tanstack Router", render: <TanStackRouterDevtoolsPanel /> },
          { name: "Tanstack Form", render: <FormDevtoolsPanel /> },
        ]}
      />
    </>
  );
}
