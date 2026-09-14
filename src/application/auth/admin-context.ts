import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

const ADMIN_ROLES = new Set(["owner", "manager", "reception", "instructor"]);

const ROLE_CAPABILITIES: Readonly<Record<string, readonly string[]>> = {
  owner: [
    "students.read",
    "students.write",
    "students.archive",
    "students.profile_fields.manage",
    "instructors.read",
    "instructors.write",
  ],
  manager: [
    "students.read",
    "students.write",
    "students.archive",
    "students.profile_fields.manage",
    "instructors.read",
    "instructors.write",
  ],
  reception: ["students.read", "students.write", "instructors.read"],
  instructor: ["students.read"],
};

export type AdminContext = Readonly<{
  studio: Readonly<{
    id: string;
    name: string;
    slug: string;
  }>;
  membership: Readonly<{
    id: string;
    personId: string | null;
  }>;
  roles: readonly string[];
  capabilities: readonly string[];
}>;

function studioSlug(name: string, id: string) {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || id;
}

export async function getAdminContext(): Promise<AdminContext> {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const authUserId = claimsData?.claims?.sub;

  if (claimsError || !authUserId) {
    redirect("/admin/login");
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("studio_members")
    .select("id, studio_id, role, status, studios(name)")
    .eq("user_id", authUserId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (membershipError || !memberships?.length) {
    redirect(
      "/admin/login?error=Tu%20cuenta%20no%20tiene%20acceso%20activo%20a%20un%20estudio",
    );
  }

  const membership = memberships.find((row) =>
    ADMIN_ROLES.has(String(row.role).toLowerCase()),
  );

  if (!membership) {
    await supabase.auth.signOut();
    redirect(
      "/admin/login?error=Tu%20cuenta%20no%20tiene%20acceso%20administrativo",
    );
  }

  const studio = Array.isArray(membership.studios)
    ? membership.studios[0]
    : membership.studios;

  if (!studio) {
    redirect("/admin/login?error=No%20se%20pudo%20resolver%20tu%20estudio");
  }

  const role = String(membership.role).toLowerCase();

  const { data: people, error: peopleError } = await supabase
    .from("people")
    .select("id")
    .eq("studio_id", membership.studio_id)
    .eq("auth_user_id", authUserId)
    .eq("status", "active")
    .limit(1);

  if (peopleError) {
    throw new Error("No se pudo resolver el perfil de la cuenta.");
  }

  const capabilities = [...(ROLE_CAPABILITIES[role] ?? [])].sort();

  return {
    studio: {
      id: membership.studio_id,
      name: studio.name,
      slug: studioSlug(studio.name, membership.studio_id),
    },
    membership: {
      id: membership.id,
      personId: people?.[0]?.id ?? null,
    },
    roles: [role],
    capabilities,
  };
}
