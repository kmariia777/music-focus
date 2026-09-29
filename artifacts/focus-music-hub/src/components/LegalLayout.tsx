import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export function LegalLayout({ title, updated, children }: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen w-full"
      style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
    >
      <main className="mx-auto max-w-2xl px-5 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm mb-8 hover:opacity-80 transition-opacity"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          <ArrowLeft size={15} /> Back to Focus Music Hub
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-xs mt-2 mb-8" style={{ color: "hsl(var(--muted-foreground))" }}>
          Last updated: {updated}
        </p>
        <div className="flex flex-col gap-6 text-sm leading-relaxed">
          {children}
        </div>
        <footer
          className="mt-12 pt-6 border-t text-xs flex items-center gap-4"
          style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}
        >
          <Link href="/privacy" className="underline underline-offset-2 hover:opacity-80">Privacy Policy</Link>
          <Link href="/terms" className="underline underline-offset-2 hover:opacity-80">Terms of Service</Link>
        </footer>
      </main>
    </div>
  );
}

export function LegalSection({ heading, children }: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-semibold mb-2">{heading}</h2>
      <div className="flex flex-col gap-2" style={{ color: "hsl(var(--muted-foreground))" }}>
        {children}
      </div>
    </section>
  );
}
