// Single-path solid arrow, tilted 45° toward the upper right — reads as a
// bull-market/growth mark. One `<path>` (not a separate head + shaft) so
// there's no visible seam at the join.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <g transform="rotate(45 12 12)">
        <path d="M12 3 L7 10 L10.5 10 L10.5 21 L13.5 21 L13.5 10 L17 10 Z" />
      </g>
    </svg>
  );
}
