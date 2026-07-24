/**
 * Chart geometry, kept apart from the component that draws it so the maths can
 * be reasoned about — and checked — without a browser.
 */

/**
 * Monotone cubic interpolation (Fritsch–Carlson), as an SVG path.
 *
 * A plain Catmull-Rom spline overshoots around a spike, and on an area chart
 * that overshoot dips the fill below the baseline — you get a day that reads as
 * negative connects. This can't overshoot: between two points the curve stays
 * within their two values, so a run of zeroes is drawn flat and a peak is drawn
 * as a peak.
 *
 * `xs` must be strictly increasing and the same length as `ys`.
 */
export function monotonePath(ys: number[], xs: number[]): string {
  const n = ys.length;
  if (n !== xs.length || n < 2) return "";

  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    slopes.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  }

  // Tangent at each point: the average of the slopes either side, flattened to
  // zero at a turning point and clamped so it can't outrun its neighbours.
  const tangents: number[] = new Array(n);
  tangents[0] = slopes[0];
  tangents[n - 1] = slopes[n - 2];
  for (let i = 1; i < n - 1; i++) {
    const prev = slopes[i - 1];
    const next = slopes[i];
    if (prev * next <= 0) {
      tangents[i] = 0;
    } else {
      const mean = (prev + next) / 2;
      const limit = 3 * Math.min(Math.abs(prev), Math.abs(next));
      tangents[i] = Math.sign(mean) * Math.min(Math.abs(mean), limit);
    }
  }

  let d = `M ${round(xs[0])} ${round(ys[0])}`;
  for (let i = 0; i < n - 1; i++) {
    const h = xs[i + 1] - xs[i];
    d +=
      ` C ${round(xs[i] + h / 3)} ${round(ys[i] + (tangents[i] * h) / 3)}` +
      ` ${round(xs[i + 1] - h / 3)} ${round(ys[i + 1] - (tangents[i + 1] * h) / 3)}` +
      ` ${round(xs[i + 1])} ${round(ys[i + 1])}`;
  }
  return d;
}

/** Three decimals is well past sub-pixel at any size this chart is drawn. */
function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Map day counts into the chart's square. `size` is the edge of the drawing
 * box; y is flipped, because SVG counts down from the top and a bigger day
 * should sit higher.
 */
export function project(
  counts: number[],
  goal: number,
  size: number
): { xs: number[]; ys: number[]; goalY: number; ceiling: number } {
  // Headroom above the tallest value so the peak never touches the ceiling,
  // and never a zero domain — an empty log would otherwise divide by nothing.
  const ceiling = Math.max(goal, ...counts, 1) * 1.18;
  const last = counts.length - 1;

  return {
    xs: counts.map((_, i) => (last === 0 ? size / 2 : (i / last) * size)),
    ys: counts.map((c) => size - (c / ceiling) * size),
    goalY: size - (goal / ceiling) * size,
    ceiling,
  };
}
