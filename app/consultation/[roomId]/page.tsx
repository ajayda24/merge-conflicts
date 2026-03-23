import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ConsultationRoom } from "@/components/consultation-room";

interface Props {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ professionalId?: string }>;
}

export default async function ConsultationPage({
  params,
  searchParams,
}: Props) {
  const { roomId } = await params;
  const { professionalId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");
  if (!professionalId) redirect("/doctors");

  // Fetch professional details
  const { data: professional } = await supabase
    .from("professional_profiles")
    .select("id, full_name, specialization, role, is_verified")
    .eq("id", professionalId)
    .eq("is_verified", true)
    .single();

  if (!professional) redirect("/doctors");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <ConsultationRoom
        roomName={roomId}
        userId={user.id}
        userName={user.email ?? user.id}
        professional={professional}
      />
    </div>
  );
}
