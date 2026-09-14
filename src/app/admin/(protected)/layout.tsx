import { getAdminContext } from "@/application/auth/admin-context";
import { AdminShell } from "@/components/admin/admin-shell";

type ProtectedAdminLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function ProtectedAdminLayout({
  children,
}: ProtectedAdminLayoutProps) {
  const context = await getAdminContext();

  return <AdminShell context={context}>{children}</AdminShell>;
}
