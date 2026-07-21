import { NextResponse } from "next/server";
import { acknowledgeInspection } from "@/lib/inspections";

export async function POST(
  request: Request,
  { params }: { params: { token: string } },
) {
  try {
    const body = await request.json();
    const name = String(body.name || "");
    const forwarded = request.headers.get("x-forwarded-for");
    const ip =
      forwarded?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const result = await acknowledgeInspection({
      token: params.token,
      name,
      ip,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not save acknowledgment",
      },
      { status: 400 },
    );
  }
}
