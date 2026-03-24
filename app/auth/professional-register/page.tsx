"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  Stethoscope,
  Brain,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Shield,
  ClipboardList,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

type Role = "doctor" | "counsellor" | "";
type RegistrationType = "NMC" | "RCI" | "";

interface FormData {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
  role: Role;
  specialization: string;
  years_experience: string;
  license_number: string;
  registration_type: RegistrationType;
  bio: string;
}

const DOCTOR_SPECIALIZATIONS = [
  "Psychiatry",
  "Gynaecology",
  "General Medicine",
  "Obstetrics",
  "Paediatrics",
  "Internal Medicine",
];

const COUNSELLOR_SPECIALIZATIONS = [
  "Clinical Psychology",
  "Counselling Psychology",
  "Trauma & PTSD",
  "Health Psychology",
  "Marriage & Family Therapy",
  "Neuropsychology",
];

const STEPS = [
  { id: 1, title: "Account", icon: Heart },
  { id: 2, title: "Role", icon: Stethoscope },
  { id: 3, title: "Credentials", icon: ClipboardList },
  { id: 4, title: "Profile", icon: Brain },
];

export default function ProfessionalRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
    role: "",
    specialization: "",
    years_experience: "",
    license_number: "",
    registration_type: "",
    bio: "",
  });

  const set = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleRoleSelect = (role: Role) => {
    set("role", role);
    set("registration_type", role === "doctor" ? "NMC" : "RCI");
    set("specialization", "");
  };

  const validateStep = (): string | null => {
    if (step === 1) {
      if (!form.full_name.trim()) return "Full name is required";
      if (!form.email.trim()) return "Email is required";
      if (form.password.length < 8)
        return "Password must be at least 8 characters";
      if (form.password !== form.confirm_password)
        return "Passwords do not match";
    }
    if (step === 2) {
      if (!form.role) return "Please select a role";
    }
    if (step === 3) {
      if (!form.specialization) return "Please select a specialization";
      if (!form.years_experience || parseInt(form.years_experience) < 0)
        return "Years of experience is required";
      if (!form.license_number.trim()) return "License number is required";
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => s + 1);
  };

  const back = () => {
    setError(null);
    setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/professionals/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          role: form.role,
          specialization: form.specialization,
          years_experience: form.years_experience,
          license_number: form.license_number,
          registration_type: form.registration_type,
          bio: form.bio,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      router.push("/auth/professional-register/success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const specializations =
    form.role === "doctor"
      ? DOCTOR_SPECIALIZATIONS
      : COUNSELLOR_SPECIALIZATIONS;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 text-primary mb-8">
          <Heart className="h-8 w-8 fill-current" />
          <span className="font-serif text-2xl font-medium">MatriLine</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = s.id === step;
            const isDone = s.id < step;
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                    isDone
                      ? "bg-primary text-primary-foreground"
                      : isActive
                        ? "bg-primary/20 text-primary ring-2 ring-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={`text-xs hidden sm:block ${isActive ? "text-primary font-medium" : "text-muted-foreground"}`}
                >
                  {s.title}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-px w-6 sm:w-12 ${s.id < step ? "bg-primary" : "bg-border"}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <Card className="border-0 shadow-lg">
          {/* Step 1: Account */}
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle className="font-serif text-2xl">
                  Create your account
                </CardTitle>
                <CardDescription>
                  Register as a mental health professional on MatriLine
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    placeholder="Dr. Jane Smith"
                    value={form.full_name}
                    onChange={(e) => set("full_name", e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm_password">Confirm Password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    placeholder="Repeat password"
                    value={form.confirm_password}
                    onChange={(e) => set("confirm_password", e.target.value)}
                    className="h-11"
                  />
                </div>
              </CardContent>
            </>
          )}

          {/* Step 2: Role */}
          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle className="font-serif text-2xl">
                  Your professional role
                </CardTitle>
                <CardDescription>
                  Select your role. This determines your registration body.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <button
                  type="button"
                  onClick={() => handleRoleSelect("doctor")}
                  className={`w-full p-5 rounded-xl border-2 text-left transition-all ${
                    form.role === "doctor"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Stethoscope className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        Doctor / Physician
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Registered with the National Medical Commission (NMC)
                      </p>
                      <Badge variant="secondary" className="mt-2 text-xs">
                        NMC Registered
                      </Badge>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSelect("counsellor")}
                  className={`w-full p-5 rounded-xl border-2 text-left transition-all ${
                    form.role === "counsellor"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
                      <Brain className="h-6 w-6 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        Psychologist / Counsellor
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Registered with the Rehabilitation Council of India
                        (RCI)
                      </p>
                      <Badge variant="secondary" className="mt-2 text-xs">
                        RCI Registered
                      </Badge>
                    </div>
                  </div>
                </button>
              </CardContent>
            </>
          )}

          {/* Step 3: Credentials */}
          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle className="font-serif text-2xl">
                  Your credentials
                </CardTitle>
                <CardDescription>
                  Your {form.registration_type} license will be reviewed before
                  verification.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Specialization</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {specializations.map((spec) => (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => set("specialization", spec)}
                        className={`px-3 py-2.5 rounded-lg border text-sm text-left transition-colors ${
                          form.specialization === spec
                            ? "border-primary bg-primary/5 text-primary font-medium"
                            : "border-border hover:border-primary/50 text-foreground"
                        }`}
                      >
                        {spec}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="license_number">
                    {form.registration_type} License Number
                  </Label>
                  <Input
                    id="license_number"
                    placeholder={`e.g. ${form.registration_type}-2024-XXXX`}
                    value={form.license_number}
                    onChange={(e) => set("license_number", e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="years_experience">Years of Experience</Label>
                  <Input
                    id="years_experience"
                    type="number"
                    min="0"
                    max="60"
                    placeholder="e.g. 8"
                    value={form.years_experience}
                    onChange={(e) => set("years_experience", e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                  <span>
                    Your license is not verified automatically. Our team will
                    review your application within 2-3 business days.
                  </span>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 4: Profile */}
          {step === 4 && (
            <>
              <CardHeader>
                <CardTitle className="font-serif text-2xl">
                  Your professional profile
                </CardTitle>
                <CardDescription>
                  Help patients understand your approach and expertise.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="bio">
                    Short Bio{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Textarea
                    id="bio"
                    placeholder="Briefly describe your approach, areas of focus, and what patients can expect working with you..."
                    value={form.bio}
                    onChange={(e) => set("bio", e.target.value)}
                    rows={5}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    {form.bio.length}/500 characters
                  </p>
                </div>

                {/* Summary */}
                <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
                  <p className="font-medium text-foreground mb-3">
                    Registration summary
                  </p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{form.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Role</span>
                    <span className="font-medium capitalize">{form.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Registration</span>
                    <Badge variant="outline" className="text-xs">
                      {form.registration_type}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Specialization
                    </span>
                    <span className="font-medium">{form.specialization}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Experience</span>
                    <span className="font-medium">
                      {form.years_experience} years
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Status after submit
                    </span>
                    <Badge className="text-xs bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-400/30">
                      Pending Review
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="mx-6 mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 px-6 pb-6">
            {step > 1 && (
              <Button variant="outline" onClick={back} className="flex-1 gap-2">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
            )}
            {step < 4 ? (
              <Button onClick={next} className="flex-1 gap-2">
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? "Submitting..." : "Submit for Review"}
              </Button>
            )}
          </div>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Registering as a patient?{" "}
          <Link
            href="/auth/sign-up"
            className="text-primary hover:underline font-medium"
          >
            Patient sign-up
          </Link>
          {" · "}
          <Link
            href="/auth/login"
            className="text-primary hover:underline font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
