import { verifyAccessToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdultRequiredClient } from "./AdultRequiredClient";

export default async function AdultRequiredPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    clearAdultFilter?: string;
  }>;
}) {
  const { next, clearAdultFilter } = await searchParams;
  const nextPath =
    typeof next === "string" && next.startsWith("/") ? next : "/";

  const token = (await cookies()).get("access_token")?.value;
  if (!token) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  try {
    await verifyAccessToken(token);
  } catch {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return (
    <AdultRequiredClient
      nextPath={nextPath}
      shouldClearAdultFilter={clearAdultFilter === "1"}
    />
  );
}
