import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeHireDetails } from "@/lib/hireAgreement";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.hire_details !== undefined) {
    updates.hire_details = normalizeHireDetails(body.hire_details);
  }
  if (body.notes !== undefined) {
    updates.notes = body.notes || null;
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("bookings")
    .update(updates)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Update failed" },
      { status: 400 },
    );
  }

  return NextResponse.json({ booking: data });
}
