import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader, StatusBadge } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { naira, openReceipt, savingsQuery } from "@/lib/savings";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Our Savings — BIG BOYS SAVES" },
      { name: "description", content: "Group totals, each member's savings and every deposit." },
      { property: "og:title", content: "Our Savings — BIG BOYS SAVES" },
      { property: "og:description", content: "Group totals, each member's savings and every deposit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading, error } = useQuery(savingsQuery);
  const qc = useQueryClient();

  if (isLoading) return <p className="p-10 text-center text-muted-foreground">Loading savings…</p>;
  if (error || !data) return <p className="p-10 text-center text-destructive">Couldn't load savings. Refresh the page.</p>;

  const names = new Map(data.profiles.map((p) => [p.id, p.display_name]));
  const confirmed = data.deposits.filter((d) => d.status === "confirmed");
  const total = confirmed.reduce((s, d) => s + d.amount, 0);
  const pendingTotal = data.deposits.filter((d) => d.status === "pending").reduce((s, d) => s + d.amount, 0);

  const cancel = async (id: string) => {
    const { error } = await supabase.from("deposits").delete().eq("id", id);
    if (error) toast.error("Couldn't cancel it.");
    else { toast.success("Deposit cancelled"); qc.invalidateQueries({ queryKey: ["savings"] }); }
  };

  return (
    <div className="min-h-screen">
      <AppHeader isAdmin={data.isAdmin} name={names.get(data.me)} />
      <main className="mx-auto max-w-5xl space-y-8 px-5 py-8">
        <section className="rounded-2xl bg-primary p-7 text-primary-foreground">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] opacity-80">Group total (confirmed)</p>
          <p className="mt-2 font-display text-5xl font-semibold">{naira(total)}</p>
          {pendingTotal > 0 && <p className="mt-2 text-sm opacity-80">{naira(pendingTotal)} waiting for the admin to confirm</p>}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.profiles.map((p) => {
            const mine = data.deposits.filter((d) => d.user_id === p.id);
            const c = mine.filter((d) => d.status === "confirmed").reduce((s, d) => s + d.amount, 0);
            const pe = mine.filter((d) => d.status === "pending").reduce((s, d) => s + d.amount, 0);
            return (
              <div key={p.id} className="rounded-xl border border-border bg-card p-5">
                <p className="font-display text-xl font-semibold">
                  {p.display_name}
                  {data.adminIds.has(p.id) && <span className="ml-2 align-middle text-xs font-sans text-accent-foreground/70">(admin)</span>}
                </p>
                <p className="mt-2 text-2xl font-semibold text-primary">{naira(c)}</p>
                <p className="text-xs text-muted-foreground">{pe > 0 ? `${naira(pe)} pending` : "Nothing pending"}</p>
              </div>
            );
          })}
        </section>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <AddDeposit userId={data.me} />
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-2xl font-semibold">All deposits</h2>
            {data.deposits.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No deposits yet. Add the first one.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {data.deposits.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <p className="font-medium">{names.get(d.user_id) ?? "Member"} · {naira(d.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(d.deposit_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        {d.note ? ` · ${d.note}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.receipt_path && (
                        <button className="text-xs text-primary underline" onClick={() => openReceipt(d.receipt_path!)}>Receipt</button>
                      )}
                      <StatusBadge status={d.status} />
                      {d.user_id === data.me && d.status === "pending" && (
                        <button className="text-xs text-destructive underline" onClick={() => cancel(d.id)}>Cancel</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function AddDeposit({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0 || n > 1e12) { toast.error("Enter an amount greater than 0"); return; }
    if (note.length > 500) { toast.error("Note is too long"); return; }
    setBusy(true);
    let receipt_path: string | null = null;
    if (file) {
      if (file.size > 10 * 1024 * 1024) { setBusy(false); { toast.error("Photo must be under 10MB"); return; } }
      const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const up = await supabase.storage.from("receipts").upload(path, file);
      if (up.error) { setBusy(false); { toast.error("Couldn't upload the receipt photo"); return; } }
      receipt_path = path;
    }
    const { error } = await supabase.from("deposits").insert({
      user_id: userId, amount: n, deposit_date: date, note: note.trim() || null, receipt_path,
    });
    setBusy(false);
    if (error) { toast.error("Couldn't save the deposit"); return; }
    toast.success("Deposit added — pending until the admin confirms it");
    setAmount(""); setNote(""); setFile(null);
    (e.target as HTMLFormElement).reset();
    qc.invalidateQueries({ queryKey: ["savings"] });
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-5">
      <h2 className="font-display text-2xl font-semibold">Add a deposit</h2>
      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount (₦)</Label>
        <Input id="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="5000" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="date">Date</Label>
        <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="e.g. Transfer from GTBank" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="receipt">Receipt photo (optional)</Label>
        <Input id="receipt" type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "Add deposit"}</Button>
      <p className="text-xs text-muted-foreground">It will show as Pending until the admin confirms it.</p>
    </form>
  );
}
