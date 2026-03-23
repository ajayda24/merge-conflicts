import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      full_name,
      email,
      password,
      role,
      specialization,
      years_experience,
      license_number,
      registration_type,
      bio,
    } = body;

    // Validate required fields
    if (
      !full_name ||
      !email ||
      !password ||
      !role ||
      !specialization ||
      !years_experience ||
      !license_number ||
      !registration_type
    ) {
      return NextResponse.json(
        { error: "All required fields must be provided" },
        { status: 400 },
      );
    }

    // Validate role / registration_type pairing
    if (role === "doctor" && registration_type !== "NMC") {
      return NextResponse.json(
        { error: "Doctors must use NMC registration" },
        { status: 400 },
      );
    }
    if (role === "counsellor" && registration_type !== "RCI") {
      return NextResponse.json(
        { error: "Counsellors must use RCI registration" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
          `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/dashboard`,
        data: { full_name },
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Simulate license validation: if license_number is non-empty → pending
    // (No real external API — status stays 'pending' for manual admin review)
    const { data: professional, error: profileError } = await supabase
      .from("professional_profiles")
      .insert({
        user_id: authData.user?.id ?? null,
        full_name,
        email,
        role,
        specialization,
        years_experience: parseInt(years_experience, 10),
        license_number,
        registration_type,
        bio: bio || null,
        status: "pending",
      })
      .select()
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      professional: { id: professional.id, status: professional.status },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
