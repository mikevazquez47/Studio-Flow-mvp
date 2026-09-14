import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminContext } from "@/application/auth/admin-context";

type AdminLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const context = await getAdminContext();

  return <AdminShell context={context}>{children}</AdminShell>;
}
