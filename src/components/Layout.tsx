import type { ReactNode } from "react";
import { NavRail } from "./NavRail";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-app">
      <NavRail />
      <div className="min-w-0 flex-1 pl-16">{children}</div>
    </div>
  );
}
