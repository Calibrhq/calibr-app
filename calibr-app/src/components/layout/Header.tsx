"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X, Trophy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggleCompact } from "@/components/ui/theme-toggle";
import { WalletButton, WalletButtonCompact } from "@/components/wallet/WalletButton";
import { useWallet } from "@/hooks/useWallet";

const navItems = [
  { label: "Explore", href: "/explore" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Profile", href: "/profile" },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isConnected, reputation, tier } = useWallet();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center transition-transform group-hover:scale-105">
            <span className="text-primary-foreground font-semibold text-sm">C</span>
          </div>
          <span className="text-xl font-semibold tracking-tight">Calibr</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                pathname === item.href
                  ? "text-foreground bg-secondary shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/how-it-works"
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
              pathname === "/how-it-works"
                ? "text-foreground bg-secondary shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            How it works
          </Link>
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <ThemeToggleCompact />

          {/* Reputation Badge (when connected) */}
          {isConnected && (
            <Link 
              href="/profile"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary text-sm transition-colors"
            >
              <Trophy className="h-4 w-4 text-primary" />
              <span className="font-semibold font-mono-numbers">{reputation}</span>
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded",
                tier === "Elite" && "bg-purple-500/10 text-purple-500",
                tier === "Proven" && "bg-blue-500/10 text-blue-500",
                tier === "New" && "bg-gray-500/10 text-gray-500"
              )}>
                {tier}
              </span>
            </Link>
          )}

          {/* Wallet Button - Desktop */}
          <div className="hidden sm:block">
            <WalletButton />
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-md animate-in slide-in-from-top-2 duration-200">
          <nav className="container py-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "block px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                  pathname === item.href
                    ? "text-foreground bg-secondary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "block px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                pathname === "/how-it-works"
                  ? "text-foreground bg-secondary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              How it works
            </Link>
            
            <div className="pt-4 border-t border-border mt-4 space-y-3 px-4">
              {isConnected && (
                <div className="flex items-center gap-2 py-2 text-sm">
                  <Trophy className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Reputation:</span>
                  <span className="font-semibold font-mono-numbers">{reputation}</span>
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded ml-1",
                    tier === "Elite" && "bg-purple-500/10 text-purple-500",
                    tier === "Proven" && "bg-blue-500/10 text-blue-500",
                    tier === "New" && "bg-gray-500/10 text-gray-500"
                  )}>
                    {tier}
                  </span>
                </div>
              )}
              <WalletButton className="w-full justify-center" />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
