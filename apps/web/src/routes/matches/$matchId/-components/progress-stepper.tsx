import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScoringPhase } from "../score";

const SCORING_STEPS: { key: ScoringPhase; label: string }[] = [
  { key: "lineup", label: "Lineup" },
  { key: "toss", label: "Toss" },
  { key: "inningsSetup", label: "Innings" },
  { key: "scoring", label: "Score" },
  { key: "completed", label: "Result" },
];
export default function ProgressStepper({
  currentPhase,
}: {
  currentPhase: ScoringPhase;
}) {
  const currentIndex = SCORING_STEPS.findIndex((s) => s.key === currentPhase);
  const NOTCH = 12;
  const CUT = 8;
  const GAP = 6;

  return (
    <nav aria-label="Scoring progress">
      <ol className="flex w-full">
        {SCORING_STEPS.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isActive = i === currentIndex;
          const isFirst = i === 0;
          const isLast = i === SCORING_STEPS.length - 1;

          let clipPath: string;
          if (isFirst) {
            clipPath = `polygon(${CUT}px 0, calc(100% - ${NOTCH}px) 0, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0 100%, 0 ${CUT}px)`;
          } else if (isLast) {
            clipPath = `polygon(0 0, 100% 0, 100% calc(100% - ${CUT}px), calc(100% - ${CUT}px) 100%, 0 100%, ${NOTCH}px 50%)`;
          } else {
            clipPath = `polygon(0 0, calc(100% - ${NOTCH}px) 0, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0 100%, ${NOTCH}px 50%)`;
          }

          return (
            <li
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "inline-flex flex-1 items-center justify-center py-2 font-medium text-xs transition-colors duration-300",
                isCompleted || isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground"
              )}
              key={step.key}
              style={{
                clipPath,
                marginLeft: i > 0 ? `calc(-${NOTCH}px + ${GAP}px)` : undefined,
                paddingLeft: isFirst
                  ? `calc(0.625rem + ${CUT}px)`
                  : `calc(0.625rem + ${NOTCH}px)`,
                paddingRight: isLast
                  ? `calc(0.625rem + ${CUT}px)`
                  : `calc(0.625rem + ${NOTCH}px)`,
              }}
            >
              {isCompleted ? (
                <CheckIcon className="mr-1 size-3 opacity-70" />
              ) : null}
              {step.label}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
