import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function AppHeader({ isAdmin, name }: { isAdmin: boolean; name?: string | undefined }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <header className="border-b border-border bg-card/70 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4">
        <Link to="/dashboard" className="font-display text-2xl font-semibold tracking-wide text-primary">
          BIG BOYS SAVES
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/dashboard" className="rounded-md px-3 py-2 hover:bg-muted" activeProps={{ className: "bg-muted font-semibold" }}>
            Savings
          </Link>
          {isAdmin && (
            <Link to="/admin" className="rounded-md px-3 py-2 hover:bg-muted" activeProps={{ className: "bg-muted font-semibold" }}>
              Admin
            </Link>
          )}
          {name && <span className="hidden px-2 text-muted-foreground sm:inline">{name}</span>}
          <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
        </nav>
      </div>
    </header>
  );
}

export function StatusBadge({ status }: { status: "pending" | "confirmed" | "rejected" }) {
  const cls =
    status === "confirmed"
      ? "bg-success/15 text-success"
      : status === "pending"
        ? "bg-warning/20 text-foreground"
        : "bg-destructive/15 text-destructive";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}>{status}</span>;
}
