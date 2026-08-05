import { useState, type FormEvent, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";

const SESSION_KEY = "stoqtrade-report-maker-unlocked";
const PIN = "1001";

// A soft, client-side-only gate — not real access control (anyone reading
// the bundle can find PIN), just a deliberate speed bump so the Report
// Maker section isn't one accidental nav-click away for every visitor. It
// stays unlocked for the rest of the browser tab's session once entered.
export function PinGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pin === PIN) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setUnlocked(true);
    } else {
      setError(true);
      setPin("");
    }
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-4 flex flex-col items-center gap-2 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-bg">
            <Lock size={20} className="text-accent" />
          </div>
          <h2 className="text-base font-extrabold tracking-tight text-foreground">Report Maker</h2>
          <p className="text-xs text-subtle-foreground">Enter the PIN to open this section.</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError(false);
            }}
            placeholder="PIN"
            className="text-center tracking-[0.3em]"
          />
          {error && <p className="text-center text-xs font-medium text-bearish">Incorrect PIN.</p>}
          <Button type="submit" className="w-full">
            Unlock
          </Button>
        </form>
      </Card>
    </div>
  );
}
