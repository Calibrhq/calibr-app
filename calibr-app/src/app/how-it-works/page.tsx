import Link from "next/link";
import { ArrowRight, Target, Sliders, Shield, TrendingUp, AlertTriangle, Brain, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

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

const examples = [
  {
    scenario: "You predict YES at 70% confidence",
    outcome: "If correct: Moderate reward, reputation boost",
    detail: "If wrong: Moderate penalty, small reputation hit",
  },
  {
    scenario: "You predict YES at 90% confidence",
    outcome: "If correct: Large reward, significant reputation boost",
    detail: "If wrong: Large penalty, major reputation hit",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="container py-8 md:py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="mb-4">How It Works</h1>
          <p className="text-lg text-muted-foreground">
            Calibr isn&apos;t about gambling on outcomes. It&apos;s about testing—and
            improving—your judgment.
          </p>
        </div>

        {/* Quick Steps */}
        <div className="grid gap-4 sm:grid-cols-2 mb-16">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="step-number mb-3">01</div>
            <h3 className="font-medium mb-2">Predict YES or NO</h3>
            <p className="text-sm text-muted-foreground">
              Pick a side on real-world events.
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="step-number mb-3">02</div>
            <h3 className="font-medium mb-2">Choose Confidence</h3>
            <p className="text-sm text-muted-foreground">
              50% to your max unlocked level.
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="step-number mb-3">03</div>
            <h3 className="font-medium mb-2">Risk Matches Confidence</h3>
            <p className="text-sm text-muted-foreground">
              Higher confidence = more at stake.
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="step-number mb-3">04</div>
            <h3 className="font-medium mb-2">Reputation Updates</h3>
            <p className="text-sm text-muted-foreground">
              Results shape your long-term score.
            </p>
          </div>
        </div>

        {/* Core Principles */}
        <div className="space-y-6 mb-16">
          <h2 className="text-xl font-medium text-center mb-8">The Core Principles</h2>
          {principles.map((principle, index) => (
            <div
              key={principle.title}
              className="flex gap-4 p-5 bg-card border border-border rounded-xl"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <principle.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-1">{principle.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {principle.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Examples */}
        <div className="mb-16">
          <h2 className="text-xl font-medium text-center mb-8">See It In Action</h2>
          <div className="space-y-4">
            {examples.map((example, index) => (
              <div key={index} className="bg-card border border-border rounded-xl p-5">
                <p className="font-medium mb-3">{example.scenario}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">{example.outcome}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">{example.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Insight */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-8 mb-16">
          <h2 className="text-xl font-medium mb-4 text-center">The Key Insight</h2>
          <p className="text-muted-foreground leading-relaxed text-center mb-6">
            Most people are overconfident. When they say they&apos;re 90% sure, they&apos;re right
            maybe 70% of the time. Calibr helps you discover—and correct—your own
            confidence blindspots.
          </p>
          <div className="grid gap-4 sm:grid-cols-3 text-center">
            <div className="p-4 rounded-lg bg-card border border-border">
              <span className="text-2xl font-bold font-mono-numbers text-primary block">70%</span>
              <span className="text-sm text-muted-foreground">confident = right</span>
              <span className="text-sm text-muted-foreground block">70% of the time</span>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="p-4 rounded-lg bg-card border border-border">
              <span className="text-2xl font-bold font-mono-numbers text-success block">↑</span>
              <span className="text-sm text-muted-foreground">Reputation</span>
              <span className="text-sm text-muted-foreground block">grows</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-muted-foreground mb-6">
            Ready to test your calibration?
          </p>
          <Link href="/explore">
            <Button size="lg" className="gap-2">
              Explore Markets
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
