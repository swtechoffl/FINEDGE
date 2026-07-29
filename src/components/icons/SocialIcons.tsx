// Official brand marks (Instagram, X, YouTube, Telegram) — lucide-react's
// icon set is generic/outline-only and has no brand glyphs, so the poster
// footer previously reused a plain "@" for both Instagram and X.
// Instagram/X/YouTube are rendered from the full-color brand SVGs in
// public/icons/ (gradient IG badge, red YouTube mark, black X badge) rather
// than tinted with currentColor, so they read as recognizable brand marks
// against the poster's dark gradient background. Telegram has no provided
// file, so it stays a currentColor line icon (simple-icons path) matching
// the surrounding text color.
interface IconProps {
  size?: number;
  className?: string;
}

export function InstagramIcon({ size = 16, className }: IconProps) {
  return <img src="/icons/instagram.svg" alt="" width={size} height={size} className={className} />;
}

export function XIcon({ size = 16, className }: IconProps) {
  return <img src="/icons/x.svg" alt="" width={size} height={size} className={className} />;
}

export function YoutubeIcon({ size = 16, className }: IconProps) {
  return <img src="/icons/youtube.svg" alt="" width={size} height={size} className={className} />;
}

export function TelegramIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}
