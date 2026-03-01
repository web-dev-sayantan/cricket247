import type * as React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  actions?: React.ReactNode;
  className?: string;
  description?: React.ReactNode;
  headingClassName?: string;
  title: React.ReactNode;
}

export function PageHeader({
  actions,
  className,
  description,
  headingClassName,
  title,
}: PageHeaderProps) {
  return (
    <header className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1
            className={cn(
              "font-semibold text-2xl tracking-tight md:text-3xl",
              headingClassName
            )}
          >
            {title}
          </h1>
          {description ? (
            <p className="text-muted-foreground text-sm md:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </header>
  );
}
