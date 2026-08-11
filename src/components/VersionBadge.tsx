function formatBuildTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(+d)) return iso;
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// A quiet, always-present build fingerprint — mounted once in Layout so
// it's visible from every page regardless of viewport. Exists mainly to
// answer "is the live site actually running the build I just pushed":
// compare the commit shown here against the latest commit on main instead
// of guessing from behavior.
export function VersionBadge() {
  return (
    <div
      title={`Built ${formatBuildTime(__APP_BUILD_TIME__)}`}
      className="fixed bottom-16 right-2 z-20 select-none rounded-full border border-border bg-surface/80 px-2 py-0.5 text-[9px] font-medium text-subtle-foreground opacity-60 backdrop-blur-sm lg:bottom-2"
    >
      v{__APP_VERSION__} · {__APP_COMMIT__}
    </div>
  );
}
