import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionScrollProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function SectionScroll({ title, children, className }: SectionScrollProps) {
  return (
    <section className={cn("py-2 relative", className)}>
      <div className="mb-5 px-4 md:px-8 flex items-center justify-between">
        <h3 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h3>
      </div>
      {/* Container padding helps prevent shadow clipping and handles start/end scroll spacing naturally */}
      <div className="flex w-full snap-x snap-mandatory gap-5 overflow-x-auto overflow-y-hidden px-4 pb-8 pt-2 md:px-8 scrollbar-hide md:gap-6 after:content-[''] after:shrink-0 after:w-1 md:after:w-4">
        {children}
      </div>
    </section>
  );
}
