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
    <section className={cn("relative py-2", className)}>
      <div className="mb-5 flex items-center justify-between px-4 md:px-8">
        <h3 className="font-bold text-xl tracking-tight md:text-2xl">
          {title}
        </h3>
      </div>
      {/* Container padding helps prevent shadow clipping and handles start/end scroll spacing naturally */}
      <div className="scrollbar-hide flex w-full snap-x snap-mandatory gap-5 overflow-x-auto overflow-y-hidden px-4 pt-2 pb-8 after:w-1 after:shrink-0 after:content-[''] md:gap-6 md:px-8 md:after:w-4">
        {children}
      </div>
    </section>
  );
}
