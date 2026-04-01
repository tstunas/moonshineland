import { cookies } from "next/headers";

import { cn } from "@/lib/cn";
import {
  PREFS_BOARD_CONTENT_WIDTH_COOKIE,
  normalizeBoardContentWidthPreference,
} from "@/lib/preferences";

export default async function BoardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const boardContentWidth = normalizeBoardContentWidthPreference(
    cookieStore.get(PREFS_BOARD_CONTENT_WIDTH_COOKIE)?.value,
  );

  return (
    <div
      className={cn(
        "w-full",
        boardContentWidth === "narrow" && "mx-auto max-w-5xl",
      )}
    >
      {children}
    </div>
  );
}
