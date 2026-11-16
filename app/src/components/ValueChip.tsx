import { useId, useState } from "react";

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
  // Set by a click that selects the value, so only that click makes the chip pop, not a chip that renders selected.
  const [pop, setPop] = useState(false);
  const className = [
    "value-chip",
    selected && "selected",
    disabled && "disabled",
    pop && "pop",
  ]
    .filter(Boolean)
    .join(" ");

  // A button must not contain another button, so the chip holds two buttons side by side.
  return (
    <div className={className} onAnimationEnd={() => setPop(false)}>
      <button
        className="value-chip-name"
        type="button"
        aria-pressed={selected}
        disabled={disabled}
        onClick={() => {
          if (!selected) setPop(true);
          onClick();
        }}
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
