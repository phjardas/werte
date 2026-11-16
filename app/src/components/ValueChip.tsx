import { useId } from "react";

interface ValueChipProps {
  value: string;
  /** Short description, opened by the ⓘ button. */
  beschreibung?: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function ValueChip({
  value,
  beschreibung,
  selected,
  disabled,
  onClick,
}: ValueChipProps) {
  const infoId = useId();
  const className = [
    "value-chip",
    selected && "selected",
    disabled && "disabled",
  ]
    .filter(Boolean)
    .join(" ");

  // A button must not contain another button, so the chip holds two buttons side by side.
  return (
    <div className={className}>
      <button
        className="value-chip-name"
        type="button"
        aria-pressed={selected}
        disabled={disabled}
        onClick={onClick}
      >
        {value}
      </button>
      {beschreibung && (
        <>
          <button
            className="value-chip-info"
            type="button"
            popoverTarget={infoId}
            aria-label={`Was bedeutet ${value}?`}
          >
            i
          </button>
          <div id={infoId} popover="auto" className="value-info">
            <strong>{value}</strong>
            <p>{beschreibung}</p>
          </div>
        </>
      )}
    </div>
  );
}
