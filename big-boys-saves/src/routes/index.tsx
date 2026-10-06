import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BIG BOYS SAVES — Our Shared Savings" },
      { name: "description", content: "A private place for our group to record savings, see every deposit, and have each one confirmed by the admin." },
      { property: "og:title", content: "BIG BOYS SAVES — Our Shared Savings" },
      { property: "og:description", content: "Record savings together. Every deposit stays pending until the admin confirms it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="max-w-xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent-foreground/70">Shared savings</p>
        <h1 className="mt-4 font-display text-5xl font-semibold leading-tight text-primary sm:text-6xl">
          BIG BOYS SAVES
        </h1>
        <div className="mx-auto my-6 h-px w-24 bg-accent" />
        <p className="text-base leading-relaxed text-muted-foreground">
          Our group savings in one place. Add your deposit any time. Everyone can see the totals, and the admin
          confirms each payment.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    </main>
  );
}
