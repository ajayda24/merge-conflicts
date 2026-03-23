"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Phone,
  Mail,
  ShieldCheck,
  ShieldOff,
  Clock,
  Brain,
  Stethoscope,
  Video,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Professional {
  id: string;
  full_name: string;
  email: string;
  role: string;
  specialization: string;
  years_experience: number;
  license_number: string;
  registration_type: "NMC" | "RCI";
  bio: string | null;
  status: "pending" | "verified" | "rejected";
  is_verified: boolean;
  created_at: string;
}

interface DoctorsContentProps {
  professionals: Professional[];
  currentUserId: string;
}

const ROLE_FILTERS = ["All", "Doctor", "Counsellor"];

const STATUS_CONFIG = {
  verified: {
    label: "Verified",
    icon: ShieldCheck,
    className:
      "border-green-400/40 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
  },
  pending: {
    label: "Pending Review",
    icon: Clock,
    className:
      "border-yellow-400/40 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20",
  },
  rejected: {
    label: "Not Verified",
    icon: ShieldOff,
    className:
      "border-red-400/40 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
  },
};

const REG_TYPE_CONFIG = {
  NMC: "border-blue-400/40 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
  RCI: "border-teal-400/40 text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20",
};

export function DoctorsContent({
  professionals,
  currentUserId,
}: DoctorsContentProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [showAll, setShowAll] = useState(false);
  const [startingCall, setStartingCall] = useState<string | null>(null);

  const startVideoCall = useCallback(
    async (professionalId: string) => {
      setStartingCall(professionalId);
      try {
        // Generate a unique room name from user+professional+timestamp
        const roomName = `matriai-${currentUserId.slice(0, 8)}-${professionalId.slice(0, 8)}-${Date.now()}`;
        router.push(
          `/consultation/${roomName}?professionalId=${professionalId}`,
        );
      } catch {
        setStartingCall(null);
      }
    },
    [currentUserId, router],
  );

  const filtered = professionals.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.full_name.toLowerCase().includes(q) ||
      p.specialization.toLowerCase().includes(q) ||
      p.registration_type.toLowerCase().includes(q);
    const matchesRole =
      roleFilter === "All" || p.role.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  // When showAll is false, show verified first, then others (for non-owners)
  const displayed = showAll
    ? filtered
    : filtered.filter(
        (p) => p.is_verified || !professionals.some((x) => x.is_verified),
      );

  // If there are verified professionals, default to showing only them unless user clicks "Show all"
  const hasVerified = professionals.some((p) => p.is_verified);
  const hiddenCount = filtered.length - displayed.length;

  return (
    <main className="container px-4 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-medium text-foreground">
          Find Professional Help
        </h1>
        <p className="text-muted-foreground mt-1">
          Connect with NMC and RCI registered mental health professionals
        </p>
      </div>

      {/* Search + Filter row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or specialization..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {ROLE_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setRoleFilter(f)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                roleFilter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {professionals.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-16 text-center">
            <Stethoscope className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="font-medium text-lg text-foreground mb-1">
              No professionals registered yet
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              Be the first to join the MatriAI professional directory.
            </p>
            <Button asChild>
              <Link href="/auth/professional-register">
                Register as Professional
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <Search className="h-10 w-10 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              No results for &quot;{searchQuery}&quot;
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {displayed.map((pro) => {
              const statusCfg = STATUS_CONFIG[pro.status];
              const StatusIcon = statusCfg.icon;

              return (
                <Card
                  key={pro.id}
                  className={`border shadow-md hover:shadow-lg transition-shadow ${
                    !pro.is_verified ? "opacity-75" : ""
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                        {pro.role === "counsellor" ? (
                          <Brain className="h-6 w-6 text-primary" />
                        ) : (
                          <span className="font-serif text-lg text-primary">
                            {pro.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <CardTitle className="font-serif text-lg leading-tight text-foreground">
                          {pro.full_name}
                        </CardTitle>
                        <CardDescription className="mt-0.5 capitalize">
                          {pro.role} · {pro.specialization}
                        </CardDescription>

                        {/* Badges row */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {/* Registration type */}
                          <Badge
                            variant="outline"
                            className={`text-xs ${REG_TYPE_CONFIG[pro.registration_type]}`}
                          >
                            {pro.registration_type} Registered
                          </Badge>

                          {/* Verification status */}
                          <Badge
                            variant="outline"
                            className={`text-xs ${statusCfg.className}`}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusCfg.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    {pro.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {pro.bio}
                      </p>
                    )}

                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>
                        <span className="font-medium text-foreground">
                          License:
                        </span>{" "}
                        {pro.registration_type}-{pro.license_number}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">
                          Experience:
                        </span>{" "}
                        {pro.years_experience} year
                        {pro.years_experience !== 1 ? "s" : ""}
                      </p>
                    </div>

                    {/* Action buttons — only shown for verified */}
                    {pro.is_verified && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          className="flex-1 gap-2"
                          onClick={() => startVideoCall(pro.id)}
                          disabled={startingCall === pro.id}
                        >
                          {startingCall === pro.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Video className="h-4 w-4" />
                          )}
                          Video Call
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="flex-1"
                        >
                          <a href={`mailto:${pro.email}`}>
                            <Mail className="h-4 w-4 mr-2" />
                            Email
                          </a>
                        </Button>
                      </div>
                    )}

                    {pro.status === "pending" && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">
                        This professional is awaiting verification and cannot be
                        contacted yet.
                      </p>
                    )}
                    {pro.status === "rejected" && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Verification was not approved for this profile.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Show all / show less toggle */}
          {hasVerified && hiddenCount > 0 && (
            <div className="mt-6 text-center">
              <Button variant="outline" onClick={() => setShowAll(true)}>
                Show {hiddenCount} more professional
                {hiddenCount !== 1 ? "s" : ""} (pending / unverified)
              </Button>
            </div>
          )}
          {showAll && hasVerified && (
            <div className="mt-2 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(false)}
              >
                Show verified only
              </Button>
            </div>
          )}
        </>
      )}

      {/* CTA */}
      <Card className="mt-8 border-0 shadow-md bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-medium text-foreground">
              Are you a mental health professional?
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Register with your NMC or RCI credentials to appear in this
              directory.
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link href="/auth/professional-register">
              Register as Professional
            </Link>
          </Button>
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground text-center">
        Verification badges are assigned after manual review of NMC/RCI
        credentials. Please verify independently before booking consultations.
      </p>
    </main>
  );
}
