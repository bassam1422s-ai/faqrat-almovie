import { PrepDetailClient } from "@/components/PrepDetailClient";

export default async function PrepDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PrepDetailClient prepListId={id} />;
}
