import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Heart,
  MessageCircle,
  Users,
  Stethoscope,
  TrendingUp,
  Shield,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="  px-4 py-6">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-primary">
            <Heart className="h-7 w-7 fill-current" />
            <span className="font-serif text-xl font-medium">MatriAI</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost">
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main>
        <section className="  px-4 py-16 md:py-24 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm mb-6">
              <Sparkles className="h-4 w-4" />
              AI-Powered Mental Wellness
            </div>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-medium text-foreground leading-tight text-balance">
              Your compassionate companion for {"women's"} mental health
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
              MatriAI combines AI technology with empathy to support your
              emotional wellbeing. Track your mood, connect with community, and
              access professional help - all in one safe space.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="h-12 px-8 text-base">
                <Link href="/auth/sign-up">Start Your Journey</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 px-8 text-base"
              >
                <Link href="/auth/login">I have an account</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="  px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl font-medium">
              How MatriAI Supports You
            </h2>
            <p className="text-muted-foreground mt-2">
              Four pillars of your wellness journey
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <TrendingUp className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-serif text-lg font-medium mb-2">
                  Daily Check-ins
                </h3>
                <p className="text-sm text-muted-foreground">
                  Track your mood, energy, and sleep patterns to understand
                  yourself better
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <MessageCircle className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-serif text-lg font-medium mb-2">
                  AI Companion
                </h3>
                <p className="text-sm text-muted-foreground">
                  Chat with Matri, your empathetic AI that listens without
                  judgment
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-serif text-lg font-medium mb-2">
                  Community
                </h3>
                <p className="text-sm text-muted-foreground">
                  Connect with others who understand, share experiences
                  anonymously
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Stethoscope className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-serif text-lg font-medium mb-2">
                  Professional Help
                </h3>
                <p className="text-sm text-muted-foreground">
                  Find verified mental health professionals who specialize in{" "}
                  {"women's"} health
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Trust Section */}
        <section className="  px-4 py-16">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 to-accent/5 max-w-4xl mx-auto">
            <CardContent className="py-12 px-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <h2 className="font-serif text-2xl font-medium mb-4">
                Your Privacy Matters
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                MatriAI is built with your privacy at its core. Your
                conversations are private, your data is secure, and you always
                have control over what you share. We never sell your
                information.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* CTA Section */}
        <section className="  px-4 py-16 text-center">
          <h2 className="font-serif text-3xl font-medium mb-4">
            Ready to Begin?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Join thousands of women taking control of their mental wellness
            journey
          </p>
          <div className="flex flex-wrap sm:flex-nowrap gap-4 mx-auto max-w-md">
            <Button asChild size="lg" className="h-12 px-8 text-base">
              <Link href="/auth/sign-up">Create Free Account</Link>
            </Button>
            <Button asChild size="lg" className="h-12 px-8 text-base">
              <Link href="/auth/professional-register">
                Register as Professional
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="  px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Heart className="h-5 w-5 fill-current text-primary" />
              <span className="font-serif">MatriAI</span>
            </div>
            {/* <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link
                href="/auth/professional-register"
                className="hover:text-primary transition-colors"
              >
                Register as Professional
              </Link>
            </div> */}
            <p className="text-sm text-muted-foreground text-center sm:text-right">
              Not a substitute for professional mental health care.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
