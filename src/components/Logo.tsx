/**
 * The Reach mark, inlined rather than loaded from /reach-logo.svg so it paints
 * with the first frame — the rail is the first thing on screen and a brand mark
 * that pops in a moment later reads as a broken image.
 *
 * The plate is bound to `--brand` so the mark can never drift from the palette;
 * the glyph stays pure black, as supplied.
 */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 800"
      fill="none"
      className={className}
      role="img"
      aria-label="Reach"
    >
      <rect width="800" height="800" rx="89" fill="var(--brand)" />
      <path
        d="M577.346 210H223.659C206.444 210 197.272 230.302 208.651 243.22L283.722 328.447C287.519 332.757 292.986 335.227 298.73 335.227H504.59C510.328 335.227 515.789 337.692 519.586 341.994L581.945 412.661C590.082 421.881 604.534 421.644 612.363 412.161L674.862 336.468C681.105 328.906 680.945 317.934 674.485 310.557L592.392 216.823C588.594 212.487 583.11 210 577.346 210Z"
        fill="black"
      />
      <path
        d="M298.041 368.242L139.173 556.598C128.134 569.686 137.574 589.69 154.694 589.491L287.331 587.946C293.044 587.879 298.456 585.372 302.201 581.058L386.778 483.625C394.863 474.311 409.37 474.463 417.257 483.945L497.69 580.632C501.489 585.199 507.123 587.841 513.065 587.841H645.059C662.221 587.841 671.412 567.647 660.141 554.706L497.532 368.001C493.734 363.64 488.234 361.136 482.45 361.136H313.33C307.435 361.136 301.842 363.736 298.041 368.242Z"
        fill="black"
      />
    </svg>
  );
}
