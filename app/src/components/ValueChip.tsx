interface ValueChipProps {
  value: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function ValueChip({
  value,
  selected,
  disabled,
  onClick,
}: ValueChipProps) {
  const className = [
    "value-chip",
    selected && "selected",
    disabled && "disabled",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={className}
      onClick={disabled ? undefined : onClick}
      type="button"
    >
      {value}
    </button>
  );
}
