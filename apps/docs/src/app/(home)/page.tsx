import Link from 'next/link';
import { Button } from '../../components/ui/button';
import { MoveRight, Zap, Code2, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col justify-center relative overflow-hidden bg-background">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-[1200px] pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="container relative z-10 px-4 py-24 mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 text-sm font-medium border rounded-full bg-muted/50 border-border text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <Zap className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
          <span>Everything you need to ship observability</span>
        </div>

        <h1 className="mb-6 text-5xl font-extrabold tracking-tight sm:text-7xl bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
          FullEvent <br /> Documentation
        </h1>

        <p className="max-w-2xl mx-auto mb-10 text-lg sm:text-xl text-muted-foreground animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
          The Hub for Dashboard as a Service. Learn how to ingest events, automate logging, and build beautiful observability experiences for your users.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-500">
          <Button asChild size="lg" className="rounded-full shadow-lg shadow-emerald-500/20">
            <Link href="/docs/quickstart">
              Get Started <MoveRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link href="/docs/sdks/node">View SDKs</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 text-left animate-in fade-in slide-in-from-bottom-20 duration-1000 delay-700">
          <div className="p-6 transition-colors border rounded-2xl bg-card/50 hover:bg-card border-border">
            <Code2 className="w-10 h-10 mb-4 text-emerald-500" />
            <h3 className="mb-2 text-xl font-bold">Node.js SDK</h3>
            <p className="text-muted-foreground">Type-safe ingestion with minimal overhead. Support for wide events and tail sampling.</p>
          </div>
          <div className="p-6 transition-colors border rounded-2xl bg-card/50 hover:bg-card border-border">
            <Zap className="w-10 h-10 mb-4 text-blue-500" />
            <h3 className="mb-2 text-xl font-bold">Hono Middleware</h3>
            <p className="text-muted-foreground">Automatic request and response logging. Zero-config integration for your Hono apps.</p>
          </div>
          <div className="p-6 transition-colors border rounded-2xl bg-card/50 hover:bg-card border-border">
            <ShieldCheck className="w-10 h-10 mb-4 text-purple-500" />
            <h3 className="mb-2 text-xl font-bold">Secure by Design</h3>
            <p className="text-muted-foreground">Built-in API key authentication and project isolation for multi-tenant environments.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
