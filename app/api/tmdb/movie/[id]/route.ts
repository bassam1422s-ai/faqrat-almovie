import { NextResponse } from "next/server";
import { getMovieDetails } from "@/lib/tmdb";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tmdbId = Number(id);
  if (!Number.isFinite(tmdbId)) {
    return NextResponse.json({ error: "معرف فلم غير صالح" }, { status: 400 });
  }

  try {
    const movie = await getMovieDetails(tmdbId);
    return NextResponse.json({ movie });
  } catch {
    return NextResponse.json(
      { error: "تعذر جلب تفاصيل الفلم" },
      { status: 502 },
    );
  }
}
