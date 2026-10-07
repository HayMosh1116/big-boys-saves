import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — BIG BOYS SAVES" },
      { name: "description", content: "Sign in or create your account to join the BIG BOYS SAVES shared savings." },
      { property: "og:title", content: "Sign in — BIG BOYS SAVES" },
      { property: "og:description", content: "Sign in with email or Google to see the group savings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password needs at least 6 characters").max(72),
  name: z.string().trim().max(60).optional(),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, name: mode === "up" ? name : undefined });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check your details"); return; }
    if (mode === "up" && !name.trim()) { toast.error("Enter your name"); return; }
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password });
      if (error) toast.error(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password,
        options: { emailRedirectTo: window.location.origin + "/auth", data: { display_name: name.trim() } },
      });
      if (error) toast.error(error.message);
      else if (!data.session) toast.success("Check your email and tap the confirmation link, then sign in.");
    }
    setBusy(false);
  };

  const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth" },
    });
    if (error) toast.error("Google sign-in didn't work. Please try again.");
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 shadow-sm">
        <h1 className="text-center font-display text-3xl font-semibold text-primary">BIG BOYS SAVES</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {mode === "in" ? "Welcome back" : "Create your account"}
        </p>
        <Button type="button" variant="outline" className="mt-6 w-full" onClick={google}>
          Continue with Google
        </Button>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === "up" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hassan" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
          className="mt-5 w-full text-center text-sm text-primary underline-offset-4 hover:underline"
        >
          {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
