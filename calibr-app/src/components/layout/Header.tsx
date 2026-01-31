"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X, Wallet, ChevronDown, Trophy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggleCompact } from "@/components/ui/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { label: "Explore", href: "/explore" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Profile", href: "/profile" },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // TODO: Replace with actual wallet connection
  const isConnected = false;
  const address = "0x2367...51e8";
  const reputation = 847;

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
            </Link>
          )}

          {/* Wallet Button */}
          {isConnected ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="font-mono text-xs">{address}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/profile">View Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button className="gap-2 hidden sm:flex">
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </Button>
          )}

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
            
            <div className="pt-4 border-t border-border mt-4 space-y-3">
              {isConnected ? (
                <>
                  <div className="flex items-center gap-2 px-4 py-2 text-sm">
                    <Trophy className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">Reputation:</span>
                    <span className="font-semibold font-mono-numbers">{reputation}</span>
                  </div>
                  <Button variant="outline" className="w-full justify-start gap-2 mx-4">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="font-mono text-xs">{address}</span>
                  </Button>
                </>
              ) : (
                <Button className="w-full gap-2 mx-4">
                  <Wallet className="h-4 w-4" />
                  Connect Wallet
                </Button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
