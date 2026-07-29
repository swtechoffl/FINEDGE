import type { ReactNode } from "react";
import { NavRail } from "./NavRail";
import { NotificationProvider } from "../notifications/NotificationContext";
import { NotificationToast } from "../notifications/NotificationToast";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <NotificationProvider>
      <div className="flex min-h-screen bg-app">
        <NavRail />
        <div className="min-w-0 flex-1 pl-16">{children}</div>
      </div>
      <NotificationToast />
    </NotificationProvider>
  );
}
