import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createExtensionInvoiceForBooking } from "@/lib/bookings";

export async function POST(
  _request: Request,
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
    const invoice = await createExtensionInvoiceForBooking(params.id);
    return NextResponse.json({ invoice });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not create extension invoice",
      },
      { status: 400 },
    );
  }
}
