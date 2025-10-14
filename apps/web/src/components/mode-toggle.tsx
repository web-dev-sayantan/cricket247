import { LaptopMinimal, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function ModeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <div className="flex items-center rounded-md border">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="rounded-r-none hover:outline-hidden hover:outline-transparent"
            onClick={() => setTheme("light")}
            size="icon"
            title="Light"
            variant={theme === "light" ? "default" : "ghost"}
          >
            <Sun
              className={cn(
                "h-5 w-5 text-brand-800",
                theme === "light" && "text-brand-50"
              )}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Light</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="rounded-none border-r border-l hover:outline-hidden hover:outline-transparent"
            onClick={() => setTheme("dark")}
            size="icon"
            title="Dark"
            variant={theme === "dark" ? "default" : "ghost"}
          >
            <Moon
              className={cn(
                "h-5 w-5 text-brand-800",
                theme === "dark" && "text-brand-50"
              )}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Dark</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="rounded-l-none hover:outline-hidden hover:outline-transparent"
            onClick={() => setTheme("system")}
            size="icon"
            title="System"
            variant={theme === "system" ? "default" : "ghost"}
          >
            <LaptopMinimal
              className={cn(
                "h-5 w-5 text-brand-800",
                theme === "system" && "text-brand-50"
              )}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">System</TooltipContent>
      </Tooltip>
    </div>
  );
}
