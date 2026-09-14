import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

export type AdminContext = Readonly<{
  studio: Readonly<{
    id: string;
    name: string;
    slug: string;
  }>;
  membership: Readonly<{
    id: string;
    personId: string;
  }>;
  roles: readonly string[];
  capabilities: readonly string[];
}>;

export async function getAdminContext(): Promise<AdminContext> {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/admin/login");
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("studio_memberships")
    .select("id, studio_id, person_id, studios(name, slug)")
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: true })
    .limit(1);

  if (membershipError || !memberships?.length) {
    redirect(
      "/admin/login?error=Tu%20cuenta%20no%20tiene%20acceso%20activo%20a%20un%20estudio",
    );
  }

  const membership = memberships[0];
  const studio = Array.isArray(membership.studios)
    ? membership.studios[0]
    : membership.studios;

  if (!studio) {
    redirect("/admin/login?error=No%20se%20pudo%20resolver%20tu%20estudio");
  }

  const { data: roleAssignments, error: rolesError } = await supabase
    .from("user_roles")
    .select("role_id, roles(code)")
    .eq("studio_membership_id", membership.id)
    .eq("status", "ACTIVE");

  if (rolesError) {
    throw new Error("No se pudieron resolver los roles de la membresía.");
  }

  const roleIds =
    roleAssignments?.map((assignment) => assignment.role_id) ?? [];
  const roleCodes =
    roleAssignments?.flatMap((assignment) => {
      const role = Array.isArray(assignment.roles)
        ? assignment.roles[0]
        : assignment.roles;
      return role?.code ? [role.code] : [];
    }) ?? [];

  let capabilities: string[] = [];

  if (roleIds.length > 0) {
    const { data: rolePermissions, error: permissionsError } = await supabase
      .from("role_permissions")
      .select("permissions(code)")
      .in("role_id", roleIds);

    if (permissionsError) {
      throw new Error("No se pudieron resolver los permisos de la membresía.");
    }

    capabilities = Array.from(
      new Set(
        rolePermissions?.flatMap((row) => {
          const permission = Array.isArray(row.permissions)
            ? row.permissions[0]
            : row.permissions;
          return permission?.code ? [permission.code] : [];
        }) ?? [],
      ),
    ).sort();
  }

  return {
    studio: {
      id: membership.studio_id,
      name: studio.name,
      slug: studio.slug,
    },
    membership: {
      id: membership.id,
      personId: membership.person_id,
    },
    roles: roleCodes.sort(),
    capabilities,
  };
}
