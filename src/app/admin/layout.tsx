import { redirect } from "next/navigation";
import { getAdminStudioContext } from "@/application/auth/get-admin-studio-context";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const context = await getAdminStudioContext();

  if (!context) {
    redirect("/admin/login");
  }

  return <>{children}</>;
}
