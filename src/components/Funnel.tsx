import { Card, Well } from "@/components/ui/layout";
import { rate } from "@/lib/pipeline";

export type FunnelStep = {
  label: string;
  value: number;
  /** The step above, so the row can show what share of it survived. */
  of: number;
};

/**
 * A funnel drawn as filled wells: each row's bar is its share of the top of the
 * funnel, so the taper is visible as shape rather than having to be read off
 * five numbers.
 *
 * Shared by both leads screens. The two pipelines have different step names but
 * the identical question - where are people falling out - so they get the
 * identical drawing of it.
 */
export function Funnel({
  steps,
  total,
  className,
}: {
  steps: readonly FunnelStep[];
  /** The denominator for the bar widths - normally the first step's value. */
  total: number;
  className?: string;
}) {
  return (
    <Card className={`p-2 ${className ?? ""}`}>
      <div className="flex flex-col gap-1">
        {steps.map((step, i) => {
          const width = total === 0 ? 0 : (step.value / total) * 100;
          const last = i === steps.length - 1;
          return (
            <Well key={step.label} className="relative overflow-hidden px-4 py-3">
              <div
                /* The last row is the one that pays - it gets the only fill
                   with any real weight to it. */
                className={`absolute inset-y-0 left-0 ${
                  last ? "bg-brand/25" : "bg-brand/8"
                }`}
                style={{ width: `${Math.max(width, step.value > 0 ? 2 : 0)}%` }}
                aria-hidden
              />
              <div className="relative flex items-baseline justify-between gap-4">
                <span className="text-[13px] font-medium">{step.label}</span>
                <span className="tabular flex items-baseline gap-2 text-xs">
                  <span
                    className={`font-semibold ${last ? "text-brand" : "text-text"}`}
                  >
                    {step.value}
                  </span>
                  {i > 0 && (
                    <span className="text-muted/70">
                      {rate(step.value, step.of)} of prev
                    </span>
                  )}
                </span>
              </div>
            </Well>
          );
        })}
      </div>
    </Card>
  );
}
