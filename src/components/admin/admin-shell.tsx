import Link from "next/link";
import type { AdminContext } from "@/application/auth/admin-context";

const navigation = [
  ["Hoy", "/admin"],
  ["Agenda", "/admin/agenda"],
  ["Alumnas", "/admin/alumnas"],
  ["Productos", "/admin/productos"],
  ["Ventas", "/admin/ventas"],
  ["Instructores", "/admin/instructores"],
  ["Reportes", "/admin/reportes"],
  ["Configuración", "/admin/configuracion"],
] as const;

type AdminShellProps = Readonly<{
  context: AdminContext;
  children: React.ReactNode;
}>;

export function AdminShell({ context, children }: AdminShellProps) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-studio">
          <span className="brand-mark">SF</span>
          <div className="admin-studio-copy">
            <strong>{context.studio.name}</strong>
            <span>StudioFlow</span>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Navegación principal">
          {navigation.map(([label, href]) => (
            <Link key={href} className="admin-nav-link" href={href}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="admin-access-summary">
          <span>Acceso</span>
          <strong>{context.roles.join(" · ") || "Sin rol asignado"}</strong>
        </div>
      </aside>

      <main className="admin-main">{children}</main>
    </div>
  );
}
