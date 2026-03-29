import { forbidden, redirect } from "next/navigation";

import { getCurrentUser } from "@/features/auth/queries";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (!currentUser.isAdmin) {
    forbidden();
  }

  return children;
}