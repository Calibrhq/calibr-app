import Link from "next/link";
import { ArrowRight, Target, TrendingUp, Shield, Brain, Clock, Award, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveTicker } from "@/components/ui/LiveTicker";

const features = [
  {
    icon: Target,
    title: "Confidence matters",
    description: "Express how sure you are, not just what you believe. Your confidence level determines your stake.",
  },
  {
    icon: TrendingUp,
    title: "Reputation compounds",
    description: "Build a track record over time. Consistent calibration unlocks higher confidence caps.",
  },
  {
    icon: Brain,
    title: "Skill > noise",
    description: "Long-term thinkers win. No lucky streaks—just genuine forecasting ability.",
  },
];

const steps = [
  {
    number: "01",
    title: "Predict YES or NO",
    description: "Browse markets and make predictions on real-world events.",
  },
  {
    number: "02",
    title: "Choose your confidence",
    description: "Slide from 50% to your max unlocked confidence level.",
  },
  {
    number: "03",
    title: "Higher confidence = higher risk",
    description: "More confidence means more at stake if you're wrong.",
  },
  {
    number: "04",
    title: "Outcomes update reputation",
    description: "Your reputation reflects how well-calibrated you are over time.",
  },
];

const differentiators = [
  {
    icon: Shield,
    title: "No reckless all-ins",
    description: "Confidence caps protect you from overconfidence. Earn higher limits over time.",
  },
  {
    icon: Clock,
    title: "No forgetting history",
    description: "Your track record follows you. Every prediction builds your reputation.",
  },
  {
    icon: Award,
    title: "Long-term thinkers win",
    description: "Calibr rewards patience and precision, not impulsive bets.",
  },
];

const stats = [
  { value: "1,234", label: "Forecasters" },
  { value: "847", label: "Avg Reputation" },
  { value: "12.4K", label: "Predictions" },
  { value: "98.2%", label: "Settlement Rate" },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-gradient-mesh" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-20 animate-pulse-subtle" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-20 animate-pulse-subtle" style={{ animationDelay: '1s' }} />

        <div className="container relative py-24 md:py-36">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-6 text-balance animate-fade-in-up">
              A prediction market for people who care about{" "}
              <span className="text-primary relative">
                being right
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 6C50 2 150 2 198 6" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" className="opacity-30" />
                </svg>
              </span>
              .
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in-up stagger-1">
              Calibr adds confidence and memory to predictions — rewarding skill, not luck.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up stagger-2">
              <Link href="/explore">
                <Button size="lg" className="gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow">
                  Start Predicting
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button size="lg" variant="outline" className="gap-2">
                  Learn How it Works
                </Button>
              </Link>
            </div>

            <div className="mt-12 mb-8 w-full max-w-2xl mx-auto animate-fade-in-up stagger-3">
              <LiveTicker />
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mt-20 max-w-3xl mx-auto animate-fade-in-up stagger-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
            {stats.map((stat, i) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold font-mono-numbers">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 border-t border-border">
        <div className="container">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-secondary text-sm">
              <Zap className="h-3.5 w-3.5 text-primary" />
              Core Principles
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">What Calibr focuses on</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A different approach to prediction markets—one built on judgment, not gambling.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="feature-card text-center group card-interactive animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-muted/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial opacity-50" />
        <div className="container relative">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">How it works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Four simple steps to start building your forecasting reputation.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="relative animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="step-number mb-4 group-hover:scale-110 transition-transform">{step.number}</div>
                <h3 className="font-medium mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiators Section */}
      <section className="py-24 border-t border-border">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">What makes it different</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Calibr is designed for thoughtful forecasters, not gamblers.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            {differentiators.map((item, i) => (
              <div
                key={item.title}
                className="bg-card border border-border rounded-xl p-6 card-interactive animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-muted/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh" />
        <div className="container relative">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
              <Target className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">
              Ready to test your calibration?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Join forecasters who value precision over luck. Build your reputation, one prediction at a time.
            </p>
            <Link href="/explore">
              <Button size="lg" className="gap-2 shadow-lg shadow-primary/20">
                Explore Markets
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
