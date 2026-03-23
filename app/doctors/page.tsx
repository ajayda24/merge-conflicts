import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { DoctorsContent } from "@/components/doctors-content";

export default async function DoctorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch seeded doctors from the legacy table
  const { data: legacyDoctors } = await supabase
    .from("doctors")
    .select("*")
    .order("rating", { ascending: false });

  // Fetch verified professionals from the professional_profiles table
  const { data: verifiedProfessionals } = await supabase
    .from("professional_profiles")
    .select("*")
    .eq("status", "verified")
    .order("created_at", { ascending: false });

  // Normalise professional_profiles rows into the Doctor shape
  const professionalDoctors = (verifiedProfessionals || []).map((p) => ({
    id: p.id,
    name: p.full_name,
    specialty: p.specialization,
    location: "India", // professional_profiles has no location field yet
    phone: null,
    email: p.email,
    bio: p.bio,
    image_url: null,
    rating: 0,
    registration_type: p.registration_type as "NMC" | "RCI",
    years_experience: p.years_experience,
  }));

  const legacyNormalised = (legacyDoctors || []).map((d) => ({
    ...d,
    registration_type: null as null,
    years_experience: null as null,
  }));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <DoctorsContent doctors={[...professionalDoctors, ...legacyNormalised]} />
    </div>
  );
}
