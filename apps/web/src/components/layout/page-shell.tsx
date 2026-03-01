import type * as React from "react";
import { cn } from "@/lib/utils";

const widthClassMap = {
  content: "max-w-6xl",
  form: "max-w-2xl",
  wide: "max-w-7xl",
} as const;

export interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  contentId?: string;
  maxWidth?: keyof typeof widthClassMap;
}

export function PageShell({
  children,
  className,
  contentClassName,
  contentId = "main-content",
  maxWidth = "content",
}: PageShellProps) {
  return (
    <div className={cn("page-surface", className)}>
      <main
        className={cn(
          "mx-auto w-full space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10",
          widthClassMap[maxWidth],
          contentClassName
        )}
        id={contentId}
      >
        {children}
      </main>
    </div>
  );
}
