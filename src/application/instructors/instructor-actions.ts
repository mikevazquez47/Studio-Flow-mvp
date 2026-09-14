"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/application/auth/admin-context";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

function normalizeOptionalPhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, "");
  if (!trimmed.startsWith("+") || digits.length < 8 || digits.length > 15) {
    throw new Error("PHONE_MUST_BE_E164");
  }

  return `+${digits}`;
}

function normalizeOptionalEmail(value: string) {
  const trimmed = value.trim().toLocaleLowerCase("en-US");
  if (!trimmed) return null;
  if (
    !trimmed.includes("@") ||
    trimmed.startsWith("@") ||
    trimmed.endsWith("@")
  ) {
    throw new Error("INVALID_EMAIL");
  }
  return trimmed;
}

export async function createInstructorQuick(formData: FormData) {
  const context = await getAdminContext();

  if (!context.capabilities.includes("instructors.write")) {
    redirect(
      "/admin/instructores?error=No%20tienes%20permiso%20para%20crear%20instructores",
    );
  }

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!firstName) {
    redirect("/admin/instructores?error=El%20nombre%20es%20obligatorio");
  }

  let normalizedPhone: string | null;
  let normalizedEmail: string | null;

  try {
    normalizedPhone = normalizeOptionalPhone(phone);
    normalizedEmail = normalizeOptionalEmail(email);
  } catch {
    redirect(
      "/admin/instructores?error=Revisa%20el%20tel%C3%A9fono%20o%20correo%20del%20instructor",
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_instructor_quick", {
    target_studio_id: context.studio.id,
    first_name_input: firstName,
    last_name_input: lastName,
    phone_input: phone || null,
    normalized_phone_input: normalizedPhone,
    email_input: email || null,
    normalized_email_input: normalizedEmail,
  });

  if (error || !data) {
    redirect(
      `/admin/instructores?error=${encodeURIComponent("No se pudo crear el instructor.")}`,
    );
  }

  revalidatePath("/admin/instructores");
  redirect(`/admin/instructores?created=${encodeURIComponent(firstName)}`);
}

export async function listInstructors(searchTerm?: string) {
  const context = await getAdminContext();

  if (!context.capabilities.includes("instructors.read")) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("instructors")
    .select(
      "id,status,created_at,persons!inner(first_name,last_name,person_contacts(type,value,is_primary))",
    )
    .eq("studio_id", context.studio.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error("No se pudo cargar el listado de instructores.");
  }

  const instructors = (data ?? []).map((instructor) => {
    const person = Array.isArray(instructor.persons)
      ? instructor.persons[0]
      : instructor.persons;
    const contacts = person?.person_contacts ?? [];
    const phone = contacts.find(
      (contact) => contact.type === "PHONE" && contact.is_primary,
    );
    const email = contacts.find(
      (contact) => contact.type === "EMAIL" && contact.is_primary,
    );

    return {
      id: instructor.id,
      firstName: person?.first_name ?? "Sin nombre",
      lastName: person?.last_name ?? "",
      phone: phone?.value ?? null,
      email: email?.value ?? null,
      status: instructor.status,
    };
  });

  const search = searchTerm?.trim().toLocaleLowerCase("es-MX");
  if (!search) return instructors;

  return instructors.filter((instructor) =>
    [
      `${instructor.firstName} ${instructor.lastName}`,
      instructor.phone ?? "",
      instructor.email ?? "",
    ]
      .join(" ")
      .toLocaleLowerCase("es-MX")
      .includes(search),
  );
}
