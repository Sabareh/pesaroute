// Shared PesaRoute brand lockup — shield mark + "PesaRoute" wordmark — used in
// every top nav so the brand reads the same across the site.
//
// By default it is theme-adaptive: the shield/route strokes and the wordmark
// resolve the --c-primary / --c-textPrimary tokens, so it works on the app's light
// AND dark surfaces (a white-background raster logo cannot). Pass `fixedLight` on
// the standalone marketing surfaces (the homepage) that stay light regardless of
// the saved theme, so it never flips to dark colours on a white nav. The wordmark
// inherits the surrounding font (Manrope on the homepage, the app font elsewhere).

export function BrandLockup({
  markSize = 26,
  textClassName = "text-[17px]",
  fixedLight = false
}: {
  markSize?: number;
  textClassName?: string;
  fixedLight?: boolean;
}) {
  const green = fixedLight ? "#1A6B45" : "rgb(var(--c-primary))";
  const ink = fixedLight ? "#11110F" : "rgb(var(--c-textPrimary))";
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={markSize} height={Math.round((markSize * 60) / 52)} viewBox="0 0 52 60" fill="none" aria-hidden>
        <path d="M26 4 L46 11 V30 C46 44 37 53 26 56 C15 53 6 44 6 30 V11 Z" fill="none" style={{ stroke: green }} strokeWidth="3.4" strokeLinejoin="round" />
        <path d="M19 47 C19 39.5 33 40 33 31 C33 23.5 20 24.5 22.5 16.5" fill="none" style={{ stroke: ink }} strokeWidth="6.6" strokeLinecap="round" />
        <path d="M14.5 49 L23 49 L21 41 L16.5 41 Z" style={{ fill: ink }} />
        <circle cx="30.5" cy="15" r="4.6" fill="none" style={{ stroke: green }} strokeWidth="2.6" />
      </svg>
      <span className={`${textClassName} font-extrabold leading-none tracking-[-0.02em]`} style={{ color: ink }}>
        Pesa<span style={{ color: green }}>Route</span>
      </span>
    </span>
  );
}
