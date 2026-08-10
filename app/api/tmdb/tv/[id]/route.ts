import { NextResponse } from "next/server";
import { getShowDetails } from "@/lib/tmdb";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tmdbId = Number(id);
  if (!Number.isFinite(tmdbId)) {
    return NextResponse.json({ error: "معرف مسلسل غير صالح" }, { status: 400 });
  }

  try {
    const show = await getShowDetails(tmdbId);
    return NextResponse.json({ show });
  } catch {
    return NextResponse.json(
      { error: "تعذر جلب تفاصيل المسلسل" },
      { status: 502 },
    );
  }
}
