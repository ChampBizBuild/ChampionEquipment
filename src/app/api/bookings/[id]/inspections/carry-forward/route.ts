import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { carryForwardOutboundFromPreviousReturn } from "@/lib/inspections";

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

  try {
    const body = await request.json().catch(() => ({}));
    const force = Boolean(body?.force);
    const result = await carryForwardOutboundFromPreviousReturn({
      bookingId: params.id,
      inspectedBy: user.email || user.id,
      force,
    });

    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002"
    ).replace(/\/$/, "");

    return NextResponse.json({
      inspection: result.inspection,
      source: result.source
        ? {
            client: result.source.source_client_name,
            inspected_at: result.source.inspected_at,
            hours_reading: result.source.hours_reading,
            fuel_level: result.source.fuel_level,
          }
        : null,
      created: result.created,
      ackUrl: `${appUrl}/inspect/${result.inspection.client_ack_token}`,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not carry forward previous return",
      },
      { status: 400 },
    );
  }
}
