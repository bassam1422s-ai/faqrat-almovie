import { NextRequest, NextResponse } from "next/server";
import { searchShows } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchShows(query);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "تعذر البحث عن المسلسلات حالياً" },
      { status: 502 },
    );
  }
}
