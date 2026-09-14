"use server";

import { redirect } from "next/navigation";
import { getAdminStudioContext } from "@/application/auth/get-admin-studio-context";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

export type LoginState = {
  error: string | null;
};

export async function loginAdmin(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresa tu correo y contraseña." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "No pudimos iniciar sesión con esos datos." };
  }

  const context = await getAdminStudioContext();

  if (!context) {
    await supabase.auth.signOut();
    return {
      error:
        "Tu cuenta no tiene acceso activo a un estudio. Contacta al administrador.",
    };
  }

  redirect("/admin");
}
