import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { transitionBookingStatus } from "@/lib/bookings";
import type { BookingStatus } from "@/lib/types";

export async function POST(
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
  const to = body.to as BookingStatus;
  const needsService = Boolean(body.needs_service);

  if (!to) {
    return NextResponse.json({ error: "Missing status" }, { status: 400 });
  }

  try {
    const result = await transitionBookingStatus({
      bookingId: params.id,
      to,
      needsService,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Status update failed" },
      { status: 400 },
    );
  }
}
