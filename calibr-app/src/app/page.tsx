import Link from "next/link";
import { ArrowRight, Target, Sliders, TrendingUp, Shield, Brain, Clock, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export default function LandingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="container relative py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-6 text-balance">
              Calibr is a prediction market for people who care about being right.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Calibr adds confidence and memory to predictions — rewarding skill, not luck.
            </p>
            <Link href="/explore">
              <Button size="lg" className="gap-2">
                Explore Markets
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 border-t border-border">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">What Calibr focuses on</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A different approach to prediction markets—one built on judgment, not gambling.
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            {features.map((feature) => (
              <div key={feature.title} className="feature-card text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
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
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">How it works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Four simple steps to start building your forecasting reputation.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.title} className="relative">
                <div className="step-number mb-4">{step.number}</div>
                <h3 className="font-medium mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-5 left-full w-full">
                    <div className="h-px bg-border w-1/2" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiators Section */}
      <section className="py-20 border-t border-border">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">What makes it different</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Calibr is designed for thoughtful forecasters, not gamblers.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            {differentiators.map((item) => (
              <div key={item.title} className="bg-card border border-border rounded-xl p-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <item.icon className="h-5 w-5 text-primary" />
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
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">
              Ready to test your calibration?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join forecasters who value precision over luck.
            </p>
            <Link href="/explore">
              <Button size="lg" className="gap-2">
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
