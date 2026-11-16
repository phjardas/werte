import type { ReactNode } from "react";

interface ProgressBarProps {
  percent: number;
  children?: ReactNode;
}

export function ProgressBar({ percent, children }: ProgressBarProps) {
  return (
    <div className="progress-bar-container test-progress">
      {/* Always rendered so the bar does not jump between steps with and without a label. */}
      <div className="progress-info">{children}</div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Fortschritt"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
      >
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
