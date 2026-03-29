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
    error?: string;
  }>;
}) {
  const { next, clearAdultFilter, error } = await searchParams;
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

  const bbatonAuthUrl = `https://bauth.bbaton.com/oauth/authorize?client_id=${process.env.BBATON_CLIENT_ID}&redirect_uri=${process.env.BBATON_REDIRECT_URI}&response_type=code&scope=read_profile&state=${encodeURIComponent(nextPath)}`;

  return (
    <AdultRequiredClient
      nextPath={nextPath}
      shouldClearAdultFilter={clearAdultFilter === "1"}
      bbatonAuthUrl={bbatonAuthUrl}
      error={error}
    />
  );
}
