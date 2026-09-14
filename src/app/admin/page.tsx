import { redirect } from "next/navigation";
import { getAdminStudioContext } from "@/application/auth/get-admin-studio-context";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { logoutAdmin } from "./actions";

export default async function AdminHomePage() {
  const context = await getAdminStudioContext();

  if (!context) {
    redirect("/admin/login");
  }

  const supabase = await createSupabaseServerClient();
  const { data: studio } = await supabase
    .from("studios")
    .select("name")
    .eq("id", context.studioId)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <span className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.12em] text-accent">
              StudioFlow · Admin
            </span>
            <h1 className="text-3xl font-semibold tracking-tight">
              {studio?.name ?? "Tu estudio"}
            </h1>
          </div>

          <form action={logoutAdmin}>
            <button
              className="rounded-[var(--radius-md)] border border-border bg-surface px-4 py-2 text-sm text-muted hover:text-foreground"
              type="submit"
            >
              Cerrar sesión
            </button>
          </form>
        </header>

        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-8 shadow-[var(--shadow-sm)]">
          <p className="mb-2 text-sm font-medium text-accent">
            Contexto administrativo validado
          </p>
          <h2 className="mb-3 text-2xl font-semibold">
            La sesión ya está aislada por estudio.
          </h2>
          <p className="max-w-2xl text-muted">
            Esta pantalla temporal confirma que autenticación, membresía y RLS
            están conectados. El siguiente slice reemplazará este contenido con
            el dashboard Hoy.
          </p>
        </section>
      </div>
    </main>
  );
}
