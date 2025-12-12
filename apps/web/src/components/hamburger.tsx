import { useState } from "react";
import { cn } from "@/lib/utils";

export default function HamburgerMenu({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleMenu();
    }
  };

  return (
    <button
      aria-expanded={isOpen}
      aria-label="Toggle menu"
      className={cn(
        "z-10 flex h-10 w-10 cursor-pointer flex-col justify-around border-none bg-transparent p-2",
        className
      )}
      onClick={toggleMenu}
      onKeyDown={handleKeyDown}
      type="button"
    >
      <span
        className={`h-0.5 w-full origin-center rounded-full bg-primary transition-all duration-300 ease-in-out ${
          isOpen ? "translate-y-2 rotate-45" : ""
        }`}
      />
      <span
        className={`h-0.5 w-full rounded-full bg-primary transition-all duration-300 ease-in-out ${
          isOpen ? "opacity-0" : ""
        }`}
      />
      <span
        className={`h-0.5 w-full origin-center rounded-full bg-primary transition-all duration-300 ease-in-out ${
          isOpen ? "-translate-y-2 -rotate-45" : ""
        }`}
      />
    </button>
  );
}
