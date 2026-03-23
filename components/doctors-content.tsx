"use client";

import { useState } from "react";
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
  MapPin,
  Phone,
  Mail,
  Star,
  Stethoscope,
  ShieldCheck,
  Brain,
} from "lucide-react";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  location: string;
  phone: string | null;
  email: string | null;
  bio: string | null;
  image_url: string | null;
  rating: number;
  registration_type: "NMC" | "RCI" | null;
  years_experience: number | null;
}

interface DoctorsContentProps {
  doctors: Doctor[];
}

const SPECIALTY_FILTERS = [
  "All",
  "Psychiatry",
  "Clinical Psychology",
  "Counselling Psychology",
  "Rehabilitation Psychology",
  "Psychiatrist",
  "Therapist",
];

export function DoctorsContent({ doctors }: DoctorsContentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");

  const filteredDoctors = doctors.filter((doctor) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      doctor.name.toLowerCase().includes(q) ||
      (doctor.location?.toLowerCase().includes(q) ?? false) ||
      doctor.specialty.toLowerCase().includes(q);

    const matchesFilter =
      selectedFilter === "All" ||
      doctor.specialty.toLowerCase().includes(selectedFilter.toLowerCase());

    return matchesSearch && matchesFilter;
  });

  return (
    <main className="  px-4 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-medium text-foreground">
          Find Professional Help
        </h1>
        <p className="text-muted-foreground mt-1">
          Connect with qualified mental health professionals who specialise in{" "}
          {"women's"} wellness
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, location, or specialty..."
          className="pl-10"
        />
      </div>

      {/* Specialty Filters */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
        {SPECIALTY_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setSelectedFilter(f)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
              selectedFilter === f
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Doctors Grid */}
      {filteredDoctors.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <Stethoscope className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-medium text-lg mb-1 text-foreground">
              No professionals found
            </h3>
            <p className="text-muted-foreground text-sm">
              Try adjusting your search or filters
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredDoctors.map((doctor) => (
            <Card
              key={doctor.id}
              className="border-0 shadow-md hover:shadow-lg transition-shadow"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                    {doctor.registration_type === "RCI" ? (
                      <Brain className="h-7 w-7 text-accent-foreground" />
                    ) : (
                      <span className="font-serif text-xl text-primary">
                        {doctor.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="font-serif text-lg text-foreground">
                        {doctor.name}
                      </CardTitle>
                      {doctor.registration_type && (
                        <Badge
                          variant="outline"
                          className={`text-xs shrink-0 ${
                            doctor.registration_type === "NMC"
                              ? "border-blue-400/40 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                              : "border-teal-400/40 text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20"
                          }`}
                        >
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          {doctor.registration_type} Verified
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="mt-0.5">
                      {doctor.specialty}
                    </CardDescription>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {doctor.rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium text-foreground">
                            {doctor.rating}
                          </span>
                        </div>
                      )}
                      {doctor.years_experience != null && (
                        <span className="text-xs text-muted-foreground">
                          {doctor.years_experience} yrs exp.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {doctor.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {doctor.bio}
                  </p>
                )}
                <div className="flex flex-col gap-2 text-sm">
                  {doctor.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate">{doctor.location}</span>
                    </div>
                  )}
                  {doctor.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>{doctor.phone}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  {doctor.phone && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <a href={`tel:${doctor.phone}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </a>
                    </Button>
                  )}
                  {doctor.email && (
                    <Button asChild size="sm" className="flex-1">
                      <a href={`mailto:${doctor.email}`}>
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Are you a professional? CTA */}
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
            <a href="/auth/professional-register">Register as Professional</a>
          </Button>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Card className="mt-4 border-0 bg-muted/40">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">
            <strong>Note:</strong> This directory is for informational purposes.
            Please verify credentials and availability directly with the
            healthcare provider.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
