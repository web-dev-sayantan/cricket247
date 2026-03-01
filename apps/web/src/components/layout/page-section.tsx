import type * as React from "react";
import { cn } from "@/lib/utils";

type SectionElement = "section" | "div" | "article";

export interface PageSectionProps {
  actions?: React.ReactNode;
  as?: SectionElement;
  children: React.ReactNode;
  className?: string;
  description?: React.ReactNode;
  title?: React.ReactNode;
}

export function PageSection({
  actions,
  as = "section",
  children,
  className,
  description,
  title,
}: PageSectionProps) {
  const Component = as;

  return (
    <Component className={cn("space-y-4", className)}>
      {title || description || actions ? (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            {title ? (
              <h2 className="font-medium text-lg tracking-tight md:text-xl">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="text-muted-foreground text-sm">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </Component>
  );
}
