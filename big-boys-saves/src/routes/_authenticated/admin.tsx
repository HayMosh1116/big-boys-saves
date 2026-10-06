import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader, StatusBadge } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { naira, openReceipt, savingsQuery, type Deposit, type DepositStatus } from "@/lib/savings";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — BIG BOYS SAVES" },
      { name: "description", content: "Confirm, edit or reject member deposits." },
      { property: "og:title", content: "Admin — BIG BOYS SAVES" },
      { property: "og:description", content: "Confirm, edit or reject member deposits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { data, isLoading } = useQuery(savingsQuery);
  const [tab, setTab] = useState<"pending" | "all">("pending");
  if (isLoading || !data) return <p className="p-10 text-center text-muted-foreground">Loading…</p>;
  const names = new Map(data.profiles.map((p) => [p.id, p.display_name]));

  if (!data.isAdmin)
    return (
      <div className="min-h-screen">
        <AppHeader isAdmin={false} name={names.get(data.me)} />
        <p className="p-10 text-center text-muted-foreground">
          Only the admin can open this page. <Link to="/dashboard" className="text-primary underline">Back to savings</Link>
        </p>
      </div>
    );

  const list = tab === "pending" ? data.deposits.filter((d) => d.status === "pending") : data.deposits;

  return (
    <div className="min-h-screen">
      <AppHeader isAdmin name={names.get(data.me)} />
      <main className="mx-auto max-w-5xl px-5 py-8">
        <h1 className="font-display text-3xl font-semibold">Review deposits</h1>
        <div className="mt-4 flex gap-2">
          <Button variant={tab === "pending" ? "default" : "outline"} size="sm" onClick={() => setTab("pending")}>
            Pending ({data.deposits.filter((d) => d.status === "pending").length})
          </Button>
          <Button variant={tab === "all" ? "default" : "outline"} size="sm" onClick={() => setTab("all")}>All</Button>
        </div>
        <div className="mt-6 space-y-3">
          {list.length === 0 && <p className="text-sm text-muted-foreground">Nothing to review right now.</p>}
          {list.map((d) => <Row key={d.id} d={d} name={names.get(d.user_id) ?? "Member"} me={data.me} />)}
        </div>
      </main>
    </div>
  );
}

function Row({ d, name, me }: { d: Deposit; name: string; me: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(d.amount));
  const [date, setDate] = useState(d.deposit_date);

  const update = async (patch: Partial<{ status: DepositStatus; amount: number; deposit_date: string }>, msg: string) => {
    const extra = patch.status ? { reviewed_by: me, reviewed_at: new Date().toISOString() } : {};
    const { error } = await supabase.from("deposits").update({ ...patch, ...extra }).eq("id", d.id);
    if (error) { toast.error("Couldn't save the change"); return; }
    toast.success(msg);
    setEditing(false);
    qc.invalidateQueries({ queryKey: ["savings"] });
  };

  const saveEdit = () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) { toast.error("Enter a valid amount"); return; }
    update({ amount: n, deposit_date: date }, "Deposit updated");
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
      <div>
        <p className="font-medium">{name} · {naira(d.amount)} <StatusBadge status={d.status} /></p>
        <p className="text-xs text-muted-foreground">
          {d.deposit_date}{d.note ? ` · ${d.note}` : ""}
          {d.receipt_path && (
            <button className="ml-2 text-primary underline" onClick={() => openReceipt(d.receipt_path!)}>View receipt</button>
          )}
        </p>
        {editing && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Input className="w-32" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
            <Input className="w-40" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Button size="sm" onClick={saveEdit}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {d.status !== "confirmed" && <Button size="sm" onClick={() => update({ status: "confirmed" }, "Confirmed")}>Confirm</Button>}
        {!editing && <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>}
        {d.status !== "rejected" && (
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => update({ status: "rejected" }, "Rejected")}>Reject</Button>
        )}
      </div>
    </div>
  );
}
