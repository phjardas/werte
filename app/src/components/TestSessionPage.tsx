import { useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { completeTest, fetchWerte } from "../api";
import { MAX_FINALE_WERTE, ordne, seiten, vorschlaege } from "../auswahl";
import { fortschritt } from "../fortschritt";
import { useStateSync } from "../hooks/useStateSync";
import { useTest } from "../hooks/useTest";
import { useTournament } from "../hooks/useTournament";
import type { KontextId } from "../kontexte";
import type { SerializedTournament, Step, TestState, WertInfo } from "../types";
import { shuffle } from "../utils";
import { ComparisonIntroStep } from "./ComparisonIntroStep";
import { ComparisonStep } from "./ComparisonStep";
import { ErrorScreen } from "./ErrorScreen";
import { FilterIntroStep } from "./FilterIntroStep";
import { FilterStep } from "./FilterStep";
import { ProgressBar } from "./ProgressBar";
import { ResultsScreen } from "./ResultsScreen";
import { SelectionStep } from "./SelectionStep";
import { SuggestionStep } from "./SuggestionStep";

export function TestSessionPage() {
  const { testId } = useParams({ from: "/tests/$testId" });
  const { session, isLoading, error, refetch } = useTest(testId);

  if (isLoading) {
    return (
      <div className="screen active step-loading">
        <span className="spinner spinner-lg" />
      </div>
    );
  }

  if (error || !session)
    return (
      <ErrorScreen
        title="Test nicht gefunden"
        message={
          error?.message ??
          "Der angeforderte Test konnte nicht gefunden werden."
        }
      />
    );

  // A backend without contexts returns none; those tests are Berufsleben.
  const kontext = session.kontext ?? "beruf";

  if (session.status === "completed" && session.results) {
    return (
      <ResultsScreen
        testId={testId}
        kontext={kontext}
        results={session.results}
        emailGesendet={session.emailGesendet}
        ablaufAm={session.ablaufAm}
      />
    );
  }

  // status === "active"
  return (
    <ActiveTest
      testId={testId}
      kontext={kontext}
      initialState={session.state}
    />
  );
}

interface ActiveTestProps {
  testId: string;
  kontext: KontextId;
  initialState: TestState | null;
}

function ActiveTest({ testId, kontext, initialState }: ActiveTestProps) {
  const [step, setStep] = useState<Step>(
    // Tests saved before the intro step was removed may still carry "intro".
    initialState?.step && (initialState.step as string) !== "intro"
      ? initialState.step
      : "selection",
  );
  const [selectedValues, setSelectedValues] = useState<string[]>(
    initialState?.selectedValues ?? [],
  );
  const [finalValues, setFinalValues] = useState<string[]>(
    initialState?.finalValues ?? [],
  );
  const [order, setOrder] = useState<string[]>([]);
  const [page, setPage] = useState(initialState?.page ?? 0);
  const [werte, setWerte] = useState<WertInfo[] | null>(null);
  const [werteError, setWerteError] = useState(false);
  const [completed, setCompleted] = useState(false);

  const { syncState, saveStatus } = useStateSync(testId);

  const brauchtWerte =
    step === "selection" ||
    step === "suggestions" ||
    step === "filter-intro" ||
    step === "filter";
  useEffect(() => {
    if (!brauchtWerte || werte) return;
    fetchWerte(kontext)
      .then((geladen) => {
        setWerte(geladen);
        setOrder(
          ordne(initialState?.order, shuffle(geladen.map((w) => w.name))),
        );
      })
      .catch(() => setWerteError(true));
  }, [brauchtWerte, werte, kontext, initialState?.order]);

  const tournament = useTournament(
    step === "comparison" ? finalValues : [],
    step === "comparison"
      ? (initialState?.tournament as SerializedTournament | undefined)
      : undefined,
  );

  const buildState = useCallback(
    (
      overrides: Partial<
        Pick<TestState, "step" | "selectedValues" | "finalValues" | "page"> & {
          tournament: SerializedTournament | undefined;
        }
      >,
    ): TestState => ({
      step: overrides.step ?? step,
      selectedValues: overrides.selectedValues ?? selectedValues,
      finalValues: overrides.finalValues ?? finalValues,
      order: order.length > 0 ? order : initialState?.order,
      page: overrides.page ?? page,
      tournament: overrides.tournament,
    }),
    [step, selectedValues, finalValues, order, page, initialState?.order],
  );

  const pages = useMemo(() => seiten(order), [order]);
  const lastPage = Math.max(pages.length - 1, 0);
  const werteMap = useMemo(
    () => new Map((werte ?? []).map((w) => [w.name, w])),
    [werte],
  );
  const suggestions = useMemo(
    () => vorschlaege(selectedValues, werte ?? [], order),
    // Computed once when the suggestions page opens, so the list does not jump while toggling.
    [step === "suggestions", werte, order],
  );

  const goTo = useCallback(
    (overrides: Parameters<typeof buildState>[0]) => {
      if (overrides.step) setStep(overrides.step);
      if (overrides.page !== undefined) setPage(overrides.page);
      if (overrides.finalValues) setFinalValues(overrides.finalValues);
      syncState(buildState(overrides));
      window.scrollTo(0, 0);
    },
    [buildState, syncState],
  );

  const handleToggle = useCallback(
    (value: string) => {
      const next = selectedValues.includes(value)
        ? selectedValues.filter((v) => v !== value)
        : [...selectedValues, value];
      setSelectedValues(next);
      syncState(buildState({ selectedValues: next }));
    },
    [selectedValues, buildState, syncState],
  );

  const continueToFilter = useCallback(() => {
    if (selectedValues.length <= MAX_FINALE_WERTE) {
      goTo({ step: "comparison-intro", finalValues: selectedValues });
    } else {
      goTo({ step: "filter-intro", finalValues: [] });
    }
  }, [selectedValues, goTo]);

  const hasSuggestions =
    vorschlaege(selectedValues, werte ?? [], order).length > 0;

  const handleSelectionNext = useCallback(() => {
    if (page < lastPage) goTo({ page: page + 1 });
    else if (hasSuggestions) goTo({ step: "suggestions" });
    else continueToFilter();
  }, [page, lastPage, hasSuggestions, goTo, continueToFilter]);

  // Back from the filter steps leads to the suggestions if there are any, else to the last selection page.
  const handleBackToSelection = useCallback(() => {
    if (hasSuggestions) goTo({ step: "suggestions" });
    else goTo({ step: "selection", page: lastPage });
  }, [hasSuggestions, lastPage, goTo]);

  const handleFilterNext = useCallback(
    (final: string[]) => goTo({ step: "comparison-intro", finalValues: final }),
    [goTo],
  );

  const handleVote = useCallback(
    (index: 0 | 1) => {
      tournament.vote(index);
      // Refs are updated synchronously — snapshot captures current state
      const snap = tournament.snapshot() ?? undefined;
      syncState(buildState({ tournament: snap }));
    },
    [tournament, buildState, syncState],
  );

  // Complete the test when tournament finishes
  useEffect(() => {
    if (step === "comparison" && tournament.isComplete && !completed) {
      setCompleted(true);
      // The results replace the last comparison without a navigation, so scroll up by hand.
      window.scrollTo(0, 0);
      completeTest(testId, tournament.results).catch(console.error);
    }
  }, [step, tournament.isComplete, tournament.results, testId, completed]);

  const handleStartComparison = useCallback(() => {
    setStep("comparison");
    syncState(buildState({ step: "comparison" }));
    window.scrollTo(0, 0);
  }, [buildState, syncState]);

  if (step === "comparison" && tournament.isComplete) {
    return (
      <ResultsScreen
        testId={testId}
        kontext={kontext}
        results={tournament.results}
      />
    );
  }

  if (werteError) {
    return (
      <ErrorScreen
        title="Werte nicht geladen"
        message="Werte konnten nicht geladen werden. Bitte versuche es später erneut."
      />
    );
  }

  if (brauchtWerte && !werte) {
    return (
      <div className="screen active step-loading">
        <span className="spinner spinner-lg" />
      </div>
    );
  }

  const tournamentWithWrappedVote = { ...tournament, vote: handleVote };
  const currentPage = Math.min(page, lastPage);
  const { matchCount, totalMatches } = tournament.progress;
  const fortschrittsbalken = (
    <ProgressBar
      percent={fortschritt(
        step,
        currentPage,
        pages.length,
        matchCount,
        totalMatches,
      )}
    >
      {step === "selection" && (
        <>
          <span>
            Seite {currentPage + 1} von {pages.length}
          </span>
          <span>{selectedValues.length} ausgewählt</span>
        </>
      )}
      {step === "comparison" && totalMatches > 0 && (
        <span>
          Szenario {matchCount} von {totalMatches}
        </span>
      )}
    </ProgressBar>
  );

  return (
    <>
      <SaveIndicator status={saveStatus} />
      {step === "selection" && (
        <SelectionStep
          fortschritt={fortschrittsbalken}
          seite={(pages[currentPage] ?? []).map((n) => werteMap.get(n)!)}
          page={currentPage}
          selected={selectedValues}
          canContinue={
            currentPage < lastPage ||
            hasSuggestions ||
            selectedValues.length >= 5
          }
          onToggle={handleToggle}
          onBack={() => goTo({ page: currentPage - 1 })}
          onNext={handleSelectionNext}
        />
      )}
      {step === "suggestions" && (
        <SuggestionStep
          fortschritt={fortschrittsbalken}
          vorschlaege={suggestions.map((n) => werteMap.get(n)!)}
          selected={selectedValues}
          onToggle={handleToggle}
          onBack={() => goTo({ step: "selection", page: lastPage })}
          onNext={continueToFilter}
        />
      )}
      {step === "filter-intro" && (
        <FilterIntroStep
          fortschritt={fortschrittsbalken}
          kontext={kontext}
          valueCount={selectedValues.length}
          onBack={handleBackToSelection}
          onNext={() => goTo({ step: "filter" })}
        />
      )}
      {step === "filter" && (
        <FilterStep
          fortschritt={fortschrittsbalken}
          values={selectedValues}
          werte={werte ?? []}
          onNext={handleFilterNext}
          onBack={handleBackToSelection}
        />
      )}
      {step === "comparison-intro" && (
        <ComparisonIntroStep
          fortschritt={fortschrittsbalken}
          kontext={kontext}
          valueCount={finalValues.length}
          onNext={handleStartComparison}
        />
      )}
      {step === "comparison" && (
        <ComparisonStep
          fortschritt={fortschrittsbalken}
          kontext={kontext}
          tournament={tournamentWithWrappedVote}
        />
      )}
    </>
  );
}

function SaveIndicator({ status }: { status: string }) {
  if (status === "idle") return null;
  return <div className={`save-indicator save-${status}`} aria-live="polite" />;
}
