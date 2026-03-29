import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DEFAULT_GUIDE_SLUG } from "./_lib/guide-docs";

export const metadata: Metadata = {
  title: "문샤인랜드: 가이드",
};

export default function GuidePage() {
  redirect(`/guide/${DEFAULT_GUIDE_SLUG}`);
}
