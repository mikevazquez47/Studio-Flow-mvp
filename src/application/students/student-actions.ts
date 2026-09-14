"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/application/auth/admin-context";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

function normalizeInternationalPhone(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (!trimmed.startsWith("+") || digits.length < 8 || digits.length > 15) {
    throw new Error("PHONE_MUST_BE_E164");
  }

  return `+${digits}`;
}

export async function createStudentQuick(formData: FormData) {
  const context = await getAdminContext();

  if (!context.capabilities.includes("students.write")) {
    redirect(
      "/admin/alumnas?error=No%20tienes%20permiso%20para%20crear%20alumnas",
    );
  }

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!firstName || !phone) {
    redirect(
      "/admin/alumnas?error=Nombre%20y%20tel%C3%A9fono%20son%20obligatorios",
    );
  }

  let normalizedPhone: string;

  try {
    normalizedPhone = normalizeInternationalPhone(phone);
  } catch {
    redirect(
      "/admin/alumnas?error=Usa%20el%20tel%C3%A9fono%20con%20lada%20internacional%2C%20por%20ejemplo%20%2B5213312345678",
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_student_quick", {
    target_studio_id: context.studio.id,
    first_name_input: firstName,
    last_name_input: lastName,
    phone_input: phone,
    normalized_phone_input: normalizedPhone,
  });

  if (error || !data) {
    redirect(
      `/admin/alumnas?error=${encodeURIComponent("No se pudo crear la alumna. Verifica los datos e intenta de nuevo.")}`,
    );
  }

  revalidatePath("/admin/alumnas");
  redirect(`/admin/alumnas?created=${encodeURIComponent(firstName)}`);
}

export async function listStudents(searchTerm?: string) {
  const context = await getAdminContext();

  if (!context.capabilities.includes("students.read")) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("students")
    .select(
      "id,status,profile_status,joined_at,persons!inner(first_name,last_name,person_contacts(type,value,normalized_value,is_primary))",
    )
    .eq("studio_id", context.studio.id)
    .neq("status", "ARCHIVED")
    .order("joined_at", { ascending: false })
    .limit(100);

  const normalizedSearch = searchTerm?.trim();
  if (normalizedSearch) {
    const safe = normalizedSearch.replace(/[,%()]/g, " ").trim();
    if (safe) {
      query = query.or(`first_name.ilike.%${safe}%,last_name.ilike.%${safe}%`, {
        referencedTable: "persons",
      });
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("No se pudo cargar el listado de alumnas.");
  }

  return (data ?? []).map((student) => {
    const person = Array.isArray(student.persons)
      ? student.persons[0]
      : student.persons;
    const contacts = person?.person_contacts ?? [];
    const primaryPhone = contacts.find(
      (contact) => contact.type === "PHONE" && contact.is_primary,
    );

    return {
      id: student.id,
      firstName: person?.first_name ?? "Sin nombre",
      lastName: person?.last_name ?? "",
      phone: primaryPhone?.value ?? "Sin teléfono",
      status: student.status,
      profileStatus: student.profile_status,
      joinedAt: student.joined_at,
    };
  });
}
