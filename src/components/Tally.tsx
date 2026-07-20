"use client";

/**
 * The signature element. The goal isn't a percentage, it's 30 discrete
 * actions — so it's drawn as a tally sheet, one mark per connect, grouped
 * in fives the way you'd score them on paper. Marks past the goal turn teal
 * and sit apart, so overshooting reads as surplus rather than as "done".
 */
export function Tally({
  count,
  goal,
  compact = false,
}: {
  count: number;
  goal: number;
  compact?: boolean;
}) {
  const groups = Math.ceil(goal / 5);
  const surplus = Math.max(0, count - goal);
  const height = compact ? "h-6" : "h-14 sm:h-16";

  return (
    <div className="flex items-end gap-2.5 sm:gap-3">
      {Array.from({ length: groups }, (_, g) => (
        <div key={g} className="flex flex-1 gap-[3px] sm:gap-1">
          {Array.from({ length: Math.min(5, goal - g * 5) }, (_, i) => {
            const index = g * 5 + i;
            const filled = index < count;
            return (
              <span
                key={i}
                className={`${height} ${
                  filled ? "tick-in bg-amber" : "bg-line"
                } min-w-[3px] flex-1 origin-bottom rounded-full transition-colors duration-300`}
                style={filled ? { boxShadow: "0 0 12px -2px var(--amber)" } : undefined}
              />
            );
          })}
        </div>
      ))}

      {surplus > 0 && (
        <div className="ml-1 flex items-end gap-[3px] border-l border-line pl-2.5 sm:gap-1">
          {Array.from({ length: Math.min(surplus, 15) }, (_, i) => (
            <span
              key={i}
              className={`${height} tick-in w-[3px] origin-bottom rounded-full bg-teal sm:w-1`}
              style={{ boxShadow: "0 0 10px -2px var(--teal)" }}
            />
          ))}
          {surplus > 15 && (
            <span className="tabular ml-1.5 self-center font-mono text-[11px] text-teal">
              +{surplus - 15}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
