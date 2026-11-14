import { useCallback, useState } from "react";
import { useTournament } from "../hooks/useTournament";
import type { Step } from "../types";
import { ComparisonIntroStep } from "./ComparisonIntroStep";
import { ComparisonStep } from "./ComparisonStep";
import { FilterStep } from "./FilterStep";
import { IntroStep } from "./IntroStep";
import { ResultsScreen } from "./ResultsScreen";
import { SelectionStep } from "./SelectionStep";

export function TestPage() {
  const [step, setStep] = useState<Step>("intro");
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [finalValues, setFinalValues] = useState<string[]>([]);

  const tournament = useTournament(step === "comparison" ? finalValues : []);

  const handleSelectionNext = useCallback((selected: string[]) => {
    setSelectedValues(selected);
    if (selected.length <= 10) {
      setFinalValues(selected);
      setStep("comparison-intro");
    } else {
      setStep("filter");
    }
  }, []);

  const handleFilterNext = useCallback((final: string[]) => {
    setFinalValues(final);
    setStep("comparison-intro");
  }, []);

  const handleFilterBack = useCallback(() => {
    setStep("selection");
  }, []);

  if (step === "comparison" && tournament.isComplete) {
    return <ResultsScreen results={tournament.results} />;
  }

  switch (step) {
    case "intro":
      return <IntroStep onNext={() => setStep("selection")} />;
    case "selection":
      return <SelectionStep onNext={handleSelectionNext} />;
    case "filter":
      return (
        <FilterStep
          values={selectedValues}
          onNext={handleFilterNext}
          onBack={handleFilterBack}
        />
      );
    case "comparison-intro":
      return (
        <ComparisonIntroStep
          valueCount={finalValues.length}
          onNext={() => setStep("comparison")}
        />
      );
    case "comparison":
      return <ComparisonStep tournament={tournament} />;
  }
}
