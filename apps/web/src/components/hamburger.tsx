import { useState } from "react";

export default function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <button
      aria-expanded={isOpen}
      aria-label="Toggle menu"
      className="z-10 flex h-10 w-10 cursor-pointer flex-col justify-around border-none bg-transparent p-2"
      onClick={toggleMenu}
    >
      <span
        className={`h-[2px] w-full origin-center rounded-full bg-primary transition-all duration-300 ease-in-out ${
          isOpen ? "translate-y-2 rotate-45" : ""
        }`}
      />
      <span
        className={`h-[2px] w-full rounded-full bg-primary transition-all duration-300 ease-in-out ${
          isOpen ? "opacity-0" : ""
        }`}
      />
      <span
        className={`h-[2px] w-full origin-center rounded-full bg-primary transition-all duration-300 ease-in-out ${
          isOpen ? "-translate-y-2 -rotate-45" : ""
        }`}
      />
    </button>
  );
}
