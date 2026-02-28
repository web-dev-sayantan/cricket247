import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <div className="hero-gradient relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
      <div className="@container">
        <div className="flex @[864px]:flex-row flex-col @[864px]:items-center @[480px]:gap-12 gap-8 px-6 py-12">
          <div className="flex flex-1 flex-col gap-8">
            <div className="flex flex-col gap-4">
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-accent-mint/20 px-3 py-1 font-bold text-emerald-600 text-xs dark:text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                2026 EDITION AVAILABLE NOW
              </div>
              <h1 className="font-extrabold @[480px]:text-6xl text-5xl text-slate-900 leading-[1.1] tracking-tight dark:text-slate-100">
                Elevate Your{" "}
                <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                  Tournament
                </span>{" "}
                Experience
              </h1>
              <p className="max-w-[500px] font-light text-lg text-slate-600 leading-relaxed dark:text-slate-400">
                The premium choice for recreational and corporate cricket
                leagues. Professional grade precision, minimalist design.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <button
                className="flex h-14 min-w-40 cursor-pointer items-center justify-center rounded-xl bg-primary px-8 font-bold text-base text-white shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02]"
                type="button"
              >
                Get Started
              </button>
              <button
                className="flex h-14 min-w-40 cursor-pointer items-center justify-center rounded-xl border border-slate-200 px-8 font-bold text-base text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-100 dark:hover:bg-slate-900"
                type="button"
              >
                View Demo
              </button>
            </div>
          </div>
          <div className="relative @[864px]:w-1/2 w-full">
            <div className="absolute -inset-4 rounded-full bg-linear-to-tr from-accent-mint/30 to-accent-lavender/30 blur-3xl" />
            <div
              className="relative aspect-4/5 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-200 shadow-2xl dark:bg-slate-800"
              data-alt="Cinematic shot of a professional cricket stadium at dusk"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCIvdMNfmHQmC-njsrK454hNGBMEWD0lG1m1x-7ZfGW1UUjsp3gNhpDuYd0wXtuuLg-YrDi80WeB9d92yxWg75IfE6wthJuSg3xp0NV9IZsKQUaGumjystZMagh6Z_4Pe-fEFNG2-Rt43MOzB3-2Dgda6A9ex95eblMop0NXxy-Q8LtFqQ7l1qbcGMFAo9DlkxmkVNUj3tYN50ZA6pRiMnz6sBut39pYLe7MRZPQmBf7KpabF3EIOccZ59GUnKxnL9hDMGg4181D_4")',
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-linear-to-t from-background-dark/80 via-transparent to-transparent" />
              <div className="glass-card absolute right-6 bottom-6 left-6 flex items-center justify-between rounded-xl p-4">
                <div>
                  <p className="font-medium text-white text-xs opacity-70">
                    CURRENT MATCH
                  </p>
                  <p className="font-bold text-lg text-white">
                    Lions vs Warriors
                  </p>
                </div>
                <div className="rounded bg-red-500 px-2 py-1 font-bold text-[10px] text-white">
                  LIVE
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="px-6 py-16">
        <div className="mb-12 flex flex-col gap-4">
          <h2 className="font-bold text-3xl text-slate-900 tracking-tight dark:text-slate-100">
            Tournament Mastery
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            Everything you need to run professional-level tournaments.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="glass-card group flex flex-col gap-6 rounded-2xl p-8 transition-all duration-300 hover:border-primary/50">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-mint/20 text-emerald-600 transition-transform group-hover:scale-110 dark:text-emerald-400">
              <span className="material-symbols-outlined text-3xl">
                sensors
              </span>
            </div>
            <div>
              <h3 className="mb-2 font-bold text-slate-900 text-xl dark:text-slate-100">
                Live Ball-by-Ball
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed dark:text-slate-400">
                Real-time updates that synchronize instantly across all
                spectator devices. Zero latency reporting.
              </p>
            </div>
          </div>
          <div className="glass-card group flex flex-col gap-6 rounded-2xl p-8 transition-all duration-300 hover:border-primary/50">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <span className="material-symbols-outlined text-3xl">
                insights
              </span>
            </div>
            <div>
              <h3 className="mb-2 font-bold text-slate-900 text-xl dark:text-slate-100">
                Advanced Statistics
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed dark:text-slate-400">
                Deep dive into player performance with wagon wheels, pitch maps,
                and predictive win probability.
              </p>
            </div>
          </div>
          <div className="glass-card group flex flex-col gap-6 rounded-2xl p-8 transition-all duration-300 hover:border-primary/50">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-lavender/20 text-purple-600 transition-transform group-hover:scale-110 dark:text-purple-400">
              <span className="material-symbols-outlined text-3xl">groups</span>
            </div>
            <div>
              <h3 className="mb-2 font-bold text-slate-900 text-xl dark:text-slate-100">
                Team Management
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed dark:text-slate-400">
                Organize rosters, track player availability, and manage
                substitutions with an intuitive interface.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="@container bg-slate-50 px-6 py-20 dark:bg-slate-900/50">
        <div className="mx-auto flex max-w-300 flex-col gap-16">
          <div className="mx-auto flex max-w-180 flex-col gap-4 text-center">
            <h2 className="font-bold text-4xl text-slate-900 tracking-tight dark:text-slate-100">
              Why Leading Leagues Choose Us?
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400">
              Designed for the modern era of cricket management with a focus on
              speed, aesthetics, and reliability.
            </p>
          </div>
          <div className="grid @[1024px]:grid-cols-3 @[640px]:grid-cols-2 grid-cols-1 gap-8">
            <div className="flex flex-col gap-6 rounded-2xl border border-slate-100 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-background-dark">
              <div className="text-primary">
                <span className="material-symbols-outlined text-4xl">bolt</span>
              </div>
              <div>
                <h4 className="mb-2 font-bold text-lg text-slate-900 dark:text-slate-100">
                  Ultra Responsive
                </h4>
                <p className="text-slate-500 text-sm dark:text-slate-400">
                  Our infrastructure ensures that data is pushed to thousands of
                  fans simultaneously without a hiccup.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-6 rounded-2xl border border-slate-100 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-background-dark">
              <div className="text-primary">
                <span className="material-symbols-outlined text-4xl">
                  pie_chart
                </span>
              </div>
              <div>
                <h4 className="mb-2 font-bold text-lg text-slate-900 dark:text-slate-100">
                  Data-Driven Insights
                </h4>
                <p className="text-slate-500 text-sm dark:text-slate-400">
                  Automatic generation of tournament leaderboards, MVP points,
                  and historical data trends.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-6 rounded-2xl border border-slate-100 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-background-dark">
              <div className="text-primary">
                <span className="material-symbols-outlined text-4xl">draw</span>
              </div>
              <div>
                <h4 className="mb-2 font-bold text-lg text-slate-900 dark:text-slate-100">
                  Elegant Design
                </h4>
                <p className="text-slate-500 text-sm dark:text-slate-400">
                  A sophisticated interface that prioritizes readability and
                  ease of use for scorers and fans alike.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="px-6 py-24 text-center">
        <div className="glass-card relative mx-auto max-w-200 overflow-hidden rounded-[2rem] p-12">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-accent-mint/10 blur-3xl" />
          <div className="relative z-10 flex flex-col items-center gap-8">
            <h2 className="font-extrabold text-4xl text-slate-900 tracking-tight dark:text-slate-100">
              Ready to transform your league?
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400">
              Join over 500+ corporate and recreational leagues managing their
              tournaments with Cricket 24/7.
            </p>
            <button
              className="flex h-16 min-w-50 cursor-pointer items-center justify-center rounded-xl bg-primary px-10 font-bold text-lg text-white shadow-primary/30 shadow-xl transition-transform hover:scale-105"
              type="button"
            >
              Start Free Trial
            </button>
            <p className="text-slate-400 text-xs dark:text-slate-500">
              No credit card required • 14-day free trial • 24/7 Support
            </p>
          </div>
        </div>
      </div>
      <footer className="border-slate-200 border-t px-6 py-12 dark:border-slate-800">
        <div className="flex @[480px]:flex-row flex-col items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">
              sports_cricket
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              Cricket 24/7
            </span>
          </div>
          <div className="flex gap-8 text-slate-500 text-sm dark:text-slate-400">
            <a className="transition-colors hover:text-primary" href="/privacy">
              Privacy
            </a>
            <a className="transition-colors hover:text-primary" href="/terms">
              Terms
            </a>
            <a className="transition-colors hover:text-primary" href="/support">
              Support
            </a>
          </div>
          <p className="text-slate-400 text-xs dark:text-slate-500">
            © 2026 Cricket 24/7 App. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
