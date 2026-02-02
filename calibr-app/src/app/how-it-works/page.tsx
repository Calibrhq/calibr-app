import Link from "next/link";
import { ArrowRight, Target, Sliders, Shield, TrendingUp, AlertTriangle, Brain, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PredictionSimulator } from "@/components/ui/PredictionSimulator";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { AnimatedCounter } from "@/components/ui/animated-counter";

const principles = [
  {
    icon: AlertTriangle,
    title: "Confidence isn't free",
    description: "Every confidence claim carries weight. Say 90% and be wrong? That costs more than saying 60%.",
  },
  {
    icon: TrendingUp,
    title: "Being wrong at high confidence hurts",
    description: "The penalty scales with overconfidence. This forces you to be honest about uncertainty.",
  },
  {
    icon: Brain,
    title: "Being right with precision builds reputation",
    description: "Accurate confidence over time compounds into a strong reputation score.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="container py-12 md:py-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20 animate-fade-in-up">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            How It Works
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Calibr isn&apos;t about gambling on outcomes. It&apos;s about testing—and
            improving—your judgment.
          </p>
        </div>

        {/* Quick Steps */}
        <div className="grid gap-6 sm:grid-cols-2 mb-24">
          {[
            { step: "01", title: "Predict YES or NO", desc: "Pick a side on real-world events.", delay: "0.1s" },
            { step: "02", title: "Choose Confidence", desc: "50% to your max unlocked level.", delay: "0.2s" },
            { step: "03", title: "Risk Matches Confidence", desc: "Higher confidence = more at stake.", delay: "0.3s" },
            { step: "04", title: "Reputation Updates", desc: "Results shape your long-term score.", delay: "0.4s" }
          ].map((item, i) => (
            <div key={i} className="animate-fade-in-up" style={{ animationDelay: item.delay }}>
              <SpotlightCard className="p-6 h-full hover:-translate-y-1 transition-transform duration-300">
                <div className="text-4xl font-bold text-primary/10 mb-4 font-mono-numbers">{item.step}</div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </SpotlightCard>
            </div>
          ))}
        </div>

        {/* Core Principles */}
        <div className="space-y-8 mb-24 animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
          <h2 className="text-2xl font-semibold text-center mb-12">The Core Principles</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {principles.map((principle, index) => (
              <SpotlightCard
                key={principle.title}
                className="p-6 h-full hover:-translate-y-1 transition-transform duration-300 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <principle.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-3">{principle.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {principle.description}
                </p>
              </SpotlightCard>
            ))}
          </div>
        </div>

        {/* Interactive Simulator */}
        <div className="mb-24 animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
          <div className="text-center mb-10">
            <h2 className="text-2xl font-semibold mb-3">Simulate Your Risk</h2>
            <p className="text-muted-foreground">
              See how confidence affects your potential returns and penalties.
            </p>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 blur-3xl opacity-50" />
            <div className="relative">
              <PredictionSimulator />
            </div>
          </div>
        </div>

        {/* How Reputation Works */}
        <div className="mb-24 animate-fade-in-up" style={{ animationDelay: "0.7s" }}>
          <h2 className="text-2xl font-semibold text-center mb-12">How Reputation Works</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              { id: 1, title: "Calibrated Wins", desc: "When you're right at 70% confidence, you gain reputation." },
              { id: 2, title: "Overconfidence Penalty", desc: "Being wrong at 90% confidence costs more than being wrong at 60%." },
              { id: 3, title: "Confidence Unlocks", desc: "Higher reputation unlocks higher max confidence levels." },
              { id: 4, title: "Long-term Focus", desc: "Reputation rewards consistent calibration over time." }
            ].map((item) => (
              <SpotlightCard key={item.id} className="p-6 flex items-start gap-4 hover:-translate-y-1 transition-transform duration-300 group">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <span className="text-primary font-bold">{item.id}</span>
                </div>
                <div>
                  <h3 className="font-medium mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </div>

        {/* Key Insight */}
        <div className="relative overflow-hidden rounded-2xl p-8 md:p-12 mb-20 animate-fade-in-up border border-primary/20 bg-card" style={{ animationDelay: "0.8s" }}>
          <div className="absolute inset-0 bg-primary/5" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-3xl rounded-full" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/10 blur-3xl rounded-full" />

          <div className="relative z-10">
            <h2 className="text-2xl font-semibold mb-6 text-center">The Key Insight</h2>
            <p className="text-muted-foreground leading-relaxed text-center mb-10 max-w-2xl mx-auto text-lg">
              Most people are overconfident. When they say they&apos;re 90% sure, they&apos;re right
              maybe 70% of the time. Calibr helps you discover—and correct—your own
              confidence blindspots.
            </p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12">
              <div className="p-6 rounded-xl bg-background/50 backdrop-blur border border-border text-center w-full md:w-48 shadow-sm">
                <div className="text-3xl font-bold font-mono-numbers text-primary mb-1 flex justify-center">
                  <AnimatedCounter value={70} />%
                </div>
                <div className="text-sm font-medium">confident = right</div>
                <div className="text-xs text-muted-foreground">70% of the time</div>
              </div>

              <div className="hidden md:flex items-center justify-center text-primary/50">
                <ArrowRight className="h-8 w-8 animate-pulse" />
              </div>
              <div className="md:hidden">
                <ArrowRight className="h-6 w-6 text-primary/50 rotate-90" />
              </div>

              <div className="p-6 rounded-xl bg-background/50 backdrop-blur border border-border text-center w-full md:w-48 shadow-sm">
                <div className="text-3xl font-bold text-green-500 mb-1 flex justify-center">
                  <TrendingUp className="h-8 w-8" />
                </div>
                <div className="text-sm font-medium">Reputation</div>
                <div className="text-xs text-muted-foreground">grows</div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center animate-fade-in-up" style={{ animationDelay: "0.9s" }}>
          <p className="text-lg text-muted-foreground mb-8">
            Ready to test your calibration?
          </p>
          <Link href="/explore">
            <Button size="lg" className="h-12 px-8 text-lg gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
              Explore Markets
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
