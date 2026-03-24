"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { createCheckoutSession } from "@/app/actions/stripe";
import type { Product } from "@/lib/products";
import {
  Heart,
  CheckCircle2,
  Video,
  MessageCircle,
  BarChart2,
  Star,
  Users,
  Sparkles,
  ArrowLeft,
  Loader2,
  ShieldCheck,
} from "lucide-react";

const featureIcons = [
  Video,
  ShieldCheck,
  Star,
  MessageCircle,
  BarChart2,
  Users,
];

interface Props {
  isPremium: boolean;
  product: Product;
  userName: string;
}

export function PremiumPageContent({ isPremium, product, userName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClaim = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await createCheckoutSession(product.id);
      if (result.free) {
        router.push("/premium/success");
      }
      // Paid flow (future) would use result.clientSecret with Stripe embedded UI
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-primary"
          >
            <Heart className="h-5 w-5 fill-current" />
            <span className="font-serif text-lg font-medium">MatriLine</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-16">
        {isPremium ? (
          /* Already premium */
          <div className="flex flex-col items-center gap-6 text-center py-24">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-medium text-foreground mb-2">
                You are already Premium!
              </h1>
              <p className="text-muted-foreground">
                You have full access to all MatriLine features including video
                consultations.
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/doctors">Find a Doctor</Link>
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left — Hero copy */}
            <div className="flex flex-col gap-6">
              <div>
                <Badge className="mb-4 bg-primary/10 text-primary border-0 text-xs font-medium px-3 py-1 rounded-full">
                  <Sparkles className="h-3 w-3 mr-1.5" />
                  Launching Offer
                </Badge>
                <h1 className="font-serif text-4xl md:text-5xl font-medium text-foreground text-balance leading-tight">
                  Unlock your full{" "}
                  <span className="text-primary">wellness journey</span>
                </h1>
                <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
                  Connect with verified doctors and counsellors via private
                  video calls. Built for women, by women.
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-3">
                {product.features.map((feat, i) => {
                  const Icon = featureIcons[i % featureIcons.length];
                  return (
                    <li
                      key={feat}
                      className="flex items-center gap-3 text-sm text-foreground"
                    >
                      <span className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                      </span>
                      {feat}
                    </li>
                  );
                })}
              </ul>

              <p className="text-xs text-muted-foreground">
                No credit card required for the launch offer. Cancel anytime.
              </p>
            </div>

            {/* Right — Pricing card */}
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 blur-xl" />
              <div className="relative bg-card border border-border rounded-2xl p-8 flex flex-col gap-6 shadow-lg">
                {/* Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    MatriLine Premium
                  </span>
                  <Badge
                    variant="secondary"
                    className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-0 rounded-full"
                  >
                    Free Launch
                  </Badge>
                </div>

                {/* Price */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-end gap-3">
                    <span className="font-serif text-6xl font-medium text-foreground">
                      ₹0
                    </span>
                    <div className="flex flex-col pb-2">
                      <span className="text-muted-foreground line-through text-lg">
                        ₹200
                      </span>
                      <span className="text-xs text-muted-foreground">
                        one-time
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Free for early adopters — limited time.
                  </p>
                </div>

                {/* Divider */}
                <div className="h-px bg-border" />

                {/* What's included */}
                <ul className="space-y-2.5">
                  {product.features.map((feat) => (
                    <li
                      key={feat}
                      className="flex items-center gap-2.5 text-sm text-foreground"
                    >
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
                <Button
                  size="lg"
                  className="w-full rounded-xl text-base font-semibold h-12"
                  onClick={handleClaim}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                      Activating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" /> Claim Free Premium
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By continuing you agree to our Terms & Privacy Policy.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
