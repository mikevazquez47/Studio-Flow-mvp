import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

export type AdminStudioContext = {
  userId: string;
  userAccountId: string;
  studioId: string;
  membershipId: string;
  personId: string;
};

export async function getAdminStudioContext(): Promise<AdminStudioContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: account } = await supabase
    .from("user_accounts")
    .select("id, status")
    .eq("auth_user_id", user.id)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!account) {
    return null;
  }

  const { data: membership } = await supabase
    .from("studio_memberships")
    .select("id, studio_id, person_id, status")
    .eq("user_account_id", account.id)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return null;
  }

  return {
    userId: user.id,
    userAccountId: account.id,
    studioId: membership.studio_id,
    membershipId: membership.id,
    personId: membership.person_id,
  };
}
