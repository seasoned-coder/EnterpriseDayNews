import { useRef, type KeyboardEvent } from "react";
import type { PriceOption } from "@/lib/api";
import { cn } from "@/lib/utils";

interface PriceChoiceProps {
  id: string;
  label: string;
  /** How a value is shown on its button, e.g. "20s". */
  format?: (value: number) => string;
  hint: string;
  options: PriceOption[];
  value: number;
  onChange: (value: number) => void;
}

/**
 * One big button per choice on the price list (issue #35), each showing its cost. Easier than a slider
 * on a phone, a trackpad or a mouse. Behaves as a radio group: arrow keys move between choices.
 */
export const PriceChoice = ({ id, label, format = String, hint, options, value, onChange }: PriceChoiceProps) => {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = options.find((option) => option.value === value);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    buttons.current[next]?.focus();
  };

  return (
    <div className="space-y-2 rounded-xl border border-student-border bg-white/[0.03] p-4">
      <p id={`${id}-label`} className="text-sm font-medium text-student-muted">
        {label}: <span className="text-neon-2">{selected ? format(selected.value) : "…"}</span>
        {selected && <> (cost: {selected.cost})</>}
      </p>
      <div role="radiogroup" aria-labelledby={`${id}-label`} className="grid grid-flow-col auto-cols-fr gap-2">
        {options.map((option, index) => {
          const checked = option.value === value;
          return (
            <button
              key={option.value}
              ref={(el) => (buttons.current[index] = el)}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={`${format(option.value)}, costs ${option.cost}`}
              tabIndex={checked ? 0 : -1}
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "flex min-h-[3.25rem] flex-col items-center justify-center rounded-lg border px-2 py-2 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-2",
                checked
                  ? "border-neon-2 bg-neon-2/15 text-student-ink"
                  : "border-student-border bg-white/[0.02] text-student-muted hover:bg-white/[0.06]",
              )}
            >
              <span className="text-base font-bold">{format(option.value)}</span>
              <span className="text-xs opacity-80">{option.cost}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-student-muted">{hint}</p>
    </div>
  );
};
