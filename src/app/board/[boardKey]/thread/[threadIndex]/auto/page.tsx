import { redirect } from "next/navigation";

export default async function ThreadAutoCompatPage({
  params,
}: {
  params: Promise<{ boardKey: string; threadIndex: string }>;
}) {
  const { boardKey, threadIndex } = await params;
  redirect(`/board/${boardKey}/${threadIndex}/auto`);
}
