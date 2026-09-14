import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

export default async function AdminHomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/admin/login");
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("studio_memberships")
    .select("studio_id, person_id, status, studios(name, slug)")
    .eq("status", "ACTIVE")
    .limit(1);

  if (membershipError || !memberships?.length) {
    redirect("/admin/login?error=Tu%20cuenta%20no%20tiene%20acceso%20activo%20a%20un%20estudio");
  }

  const membership = memberships[0];
  const studio = Array.isArray(membership.studios)
    ? membership.studios[0]
    : membership.studios;

  return (
    <main className="app-shell">
      <section className="hero-card">
        <span className="eyebrow">Admin Alpha</span>
        <h1>Acceso autorizado.</h1>
        <p>
          {studio?.name ?? "Tu estudio"} ya está resolviendo identidad, sesión y
          membresía activa desde Supabase. El siguiente paso es convertir esta entrada
          en el AdminShell operativo.
        </p>
      </section>
    </main>
  );
}
