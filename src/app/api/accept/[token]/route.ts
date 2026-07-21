import { NextResponse } from "next/server";
import { acceptBookingByToken } from "@/lib/bookings";

export async function POST(
  request: Request,
  { params }: { params: { token: string } },
) {
  const body = await request.json();
  const acceptedName = String(body.accepted_name || "");

  const forwarded = request.headers.get("x-forwarded-for");
  const acceptedIp =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  try {
    const result = await acceptBookingByToken({
      token: params.token,
      acceptedName,
      acceptedIp,
      hireDetails: body.hire_details,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Acceptance failed" },
      { status: 400 },
    );
  }
}
