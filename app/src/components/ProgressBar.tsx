import type { TournamentProgress } from "../hooks/useTournament";

interface ProgressBarProps {
  progress: TournamentProgress;
}

export function ProgressBar({ progress }: ProgressBarProps) {
  const percent =
    progress.totalMatches > 0
      ? (progress.matchCount / progress.totalMatches) * 100
      : 0;

  return (
    <div className="progress-bar-container">
      <div className="progress-info">
        <span>
          Vergleich {progress.matchCount} von {progress.totalMatches}
        </span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
