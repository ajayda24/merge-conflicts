"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoodCheckin } from "@/components/mood-checkin";
import {
  MessageCircle,
  Users,
  Stethoscope,
  TrendingUp,
  Calendar,
  Sparkles,
} from "lucide-react";

interface CheckinData {
  id: string;
  mood: number;
  energy: number;
  sleep_quality: number;
  notes: string | null;
  created_at: string;
}

interface ProfileData {
  full_name: string | null;
  life_stage: string | null;
}

interface DashboardContentProps {
  profile: ProfileData;
  recentCheckins: CheckinData[];
  hasCheckedInToday: boolean;
}

const moodLabels = ["", "Very Low", "Low", "Okay", "Good", "Great"];
const moodColors = [
  "",
  "bg-red-400",
  "bg-orange-400",
  "bg-yellow-400",
  "bg-lime-400",
  "bg-green-400",
];

export function DashboardContent({
  profile,
  recentCheckins,
  hasCheckedInToday,
}: DashboardContentProps) {
  const [checkedIn, setCheckedIn] = useState(hasCheckedInToday);
  const firstName = profile.full_name?.split(" ")[0] || "there";

  // Use useEffect so greeting is only computed client-side, avoiding SSR/CSR mismatch
  const [greeting, setGreeting] = useState("");
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const avgMood =
    recentCheckins.length > 0
      ? (
          recentCheckins.reduce((sum, c) => sum + (c.mood || 0), 0) /
          recentCheckins.length
        ).toFixed(1)
      : null;

  return (
    <main className="  px-4 py-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-medium text-foreground">
          {greeting}, {firstName}
        </h1>
        <p className="text-muted-foreground mt-1">
          {"Here's your wellness overview for today"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Check-in */}
        <div className="lg:col-span-2 space-y-6">
          {!checkedIn ? (
            <MoodCheckin onComplete={() => setCheckedIn(true)} />
          ) : (
            <Card className="border-0 shadow-md bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <svg
                      className="h-6 w-6 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-medium">
                      {"You've checked in today"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Great job taking time for self-reflection!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Mood Trend */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Your Week at a Glance
              </CardTitle>
              <CardDescription>
                Mood trends from the past 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentCheckins.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-end gap-2 h-32">
                    {[...recentCheckins].reverse().map((checkin, i) => (
                      <div
                        key={checkin.id}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <div
                          className={`w-full rounded-t-lg ${moodColors[checkin.mood]} transition-all`}
                          style={{ height: `${(checkin.mood / 5) * 100}%` }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {new Date(checkin.created_at).toLocaleDateString(
                            "en-US",
                            { weekday: "short" },
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                  {avgMood && (
                    <p className="text-sm text-center text-muted-foreground">
                      Average mood:{" "}
                      <span className="font-medium text-foreground">
                        {avgMood}/5
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No check-ins yet this week</p>
                  <p className="text-sm">Start tracking to see your trends</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Quick Actions */}
        <div className="space-y-6">
          <Card className="border-0 shadow-md bg-gradient-to-br from-primary/10 to-primary/5">
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Talk to Matri
              </CardTitle>
              <CardDescription>
                Your AI wellness companion is here to listen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full gap-2">
                <Link href="/chat">
                  <MessageCircle className="h-4 w-4" />
                  Start a Conversation
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="font-serif text-lg">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                asChild
                variant="outline"
                className="w-full justify-start gap-3"
              >
                <Link href="/community">
                  <Users className="h-4 w-4 text-primary" />
                  Community Discussions
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start gap-3"
              >
                <Link href="/doctors">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  Find Professional Help
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Wellness Tip */}
          <Card className="border-0 shadow-md bg-accent/10">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-accent-foreground mb-2">
                Wellness Tip
              </p>
              <p className="text-sm text-muted-foreground">
                Taking just 5 minutes for deep breathing can help reduce stress
                hormones and improve your mood. Try it now!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
