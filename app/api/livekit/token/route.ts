import { AccessToken } from "livekit-server-sdk";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { professionalId, roomName } = await req.json();

  if (!professionalId || !roomName) {
    return NextResponse.json(
      { error: "Missing professionalId or roomName" },
      { status: 400 },
    );
  }

  // Verify the professional is verified
  const { data: pro, error: proError } = await supabase
    .from("professional_profiles")
    .select("id, full_name, is_verified, user_id")
    .eq("id", professionalId)
    .eq("is_verified", true)
    .single();

  if (proError || !pro) {
    return NextResponse.json(
      { error: "Professional not found or not verified" },
      { status: 404 },
    );
  }

  // If the calling user IS the doctor, skip upsert (they are joining, not creating)
  const isDoctorJoining = pro.user_id === user.id;

  if (!isDoctorJoining) {
    // Patient: upsert the consultation record
    const { error: consultError } = await supabase.from("consultations").upsert(
      {
        room_name: roomName,
        user_id: user.id,
        professional_id: professionalId,
        status: "waiting",
      },
      { onConflict: "room_name" },
    );
    if (consultError) {
      return NextResponse.json(
        { error: "Failed to create consultation" },
        { status: 500 },
      );
    }
  }

  const apiKey = process.env.LIVEKIT_API_KEY!;
  const apiSecret = process.env.LIVEKIT_API_SECRET!;

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "LiveKit not configured" },
      { status: 500 },
    );
  }

  // Generate token for the user
  const at = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: user.email ?? user.id,
    ttl: "2h",
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  return NextResponse.json({
    token,
    roomName,
    professionalName: pro.full_name,
  });
}
