import { NextResponse } from "next/server";
import { getMovieCredits } from "@/lib/tmdb";

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
    const cast = await getMovieCredits(tmdbId);
    return NextResponse.json({ cast });
  } catch {
    return NextResponse.json(
      { error: "تعذر جلب طاقم التمثيل" },
      { status: 502 },
    );
  }
}
