import {
  InningsSetupPhaseCard,
  type InningsSetupPhaseCardProps,
} from "@/routes/matches/$matchId/-components/innings-setup-phase-card";
import {
  LineupPhaseCard,
  type LineupPhaseCardProps,
} from "@/routes/matches/$matchId/-components/lineup-phase-card";
import {
  TossPhaseCard,
  type TossPhaseCardProps,
} from "@/routes/matches/$matchId/-components/toss-phase-card";
import type { PreMatchPhase } from "@/routes/matches/$matchId/-pre-match-types";

interface PreMatchSetupFlowProps {
  inningsSetup: InningsSetupPhaseCardProps;
  lineup: LineupPhaseCardProps;
  phase: PreMatchPhase;
  toss: TossPhaseCardProps;
}

export function PreMatchSetupFlow({
  inningsSetup,
  lineup,
  phase,
  toss,
}: PreMatchSetupFlowProps) {
  switch (phase) {
    case "lineup":
      return <LineupPhaseCard {...lineup} />;
    case "toss":
      return <TossPhaseCard {...toss} />;
    case "inningsSetup":
      return <InningsSetupPhaseCard {...inningsSetup} />;
    default: {
      const exhaustiveCheck: never = phase;
      return exhaustiveCheck;
    }
  }
}
