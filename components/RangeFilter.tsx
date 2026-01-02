"use client";

export type RangeOption = "7" | "30" | "90" | "custom";

export const RangeFilter = ({
  value,
  onChange
}: {
  value: RangeOption;
  onChange: (next: RangeOption) => void;
}) => {
  const options: RangeOption[] = ["7", "30", "90", "custom"];

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={
            value === option
              ? "button-primary"
              : "button-secondary text-slate-600"
          }
        >
          {option === "custom" ? "Custom" : `Last ${option}d`}
        </button>
      ))}
    </div>
  );
};
