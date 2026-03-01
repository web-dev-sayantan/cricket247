import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionScrollProps {
  children: ReactNode;
  className?: string;
  title: string;
}

export function SectionScroll({
  title,
  children,
  className,
}: SectionScrollProps) {
  return (
    <section className={cn("relative space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-xl tracking-tight md:text-2xl">
          {title}
        </h2>
      </div>
      <div className="scrollbar-hide flex w-full snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-hidden px-0.5 pb-4">
        {children}
      </div>
    </section>
  );
}
