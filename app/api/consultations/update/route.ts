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

  const { roomName, status } = await req.json();
  if (!roomName || !status) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { status };
  if (status === "active") updateData.started_at = new Date().toISOString();
  if (status === "ended") updateData.ended_at = new Date().toISOString();

  const { error } = await supabase
    .from("consultations")
    .update(updateData)
    .eq("room_name", roomName)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
