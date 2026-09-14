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

export async function getStudent360(studentId: string) {
  const context = await getAdminContext();

  if (!context.capabilities.includes("students.read")) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const [
    { data: student, error: studentError },
    { data: fields, error: fieldsError },
  ] = await Promise.all([
    supabase
      .from("students")
      .select(
        "id,status,profile_status,joined_at,persons!inner(id,first_name,last_name,person_contacts(type,value,normalized_value,is_primary))",
      )
      .eq("studio_id", context.studio.id)
      .eq("id", studentId)
      .single(),
    supabase
      .from("student_profile_fields")
      .select(
        "id,key,label,field_type,category,storage_source,is_system,is_required_for_profile,visible_to_admin,display_order",
      )
      .eq("studio_id", context.studio.id)
      .eq("is_active", true)
      .eq("visible_to_admin", true)
      .order("display_order", { ascending: true }),
  ]);

  if (studentError || !student) {
    return null;
  }

  if (fieldsError) {
    throw new Error("No se pudo cargar el esquema del perfil de la alumna.");
  }

  const { data: values, error: valuesError } = await supabase
    .from("student_profile_values")
    .select(
      "field_id,value_text,value_number,value_date,value_boolean,value_json",
    )
    .eq("studio_id", context.studio.id)
    .eq("student_id", studentId);

  if (valuesError) {
    throw new Error("No se pudieron cargar los datos del perfil de la alumna.");
  }

  const person = Array.isArray(student.persons)
    ? student.persons[0]
    : student.persons;
  const contacts = person?.person_contacts ?? [];
  const primaryPhone = contacts.find(
    (contact) => contact.type === "PHONE" && contact.is_primary,
  );
  const primaryEmail = contacts.find(
    (contact) => contact.type === "EMAIL" && contact.is_primary,
  );
  const valueByField = new Map(
    (values ?? []).map((value) => [value.field_id, value]),
  );

  const profileFields = (fields ?? []).map((field) => {
    const storedValue = valueByField.get(field.id);
    let value: unknown = null;

    switch (field.storage_source) {
      case "PERSON_FIRST_NAME":
        value = person?.first_name ?? null;
        break;
      case "PERSON_LAST_NAME":
        value = person?.last_name ?? null;
        break;
      case "PRIMARY_PHONE":
        value = primaryPhone?.value ?? null;
        break;
      case "PRIMARY_EMAIL":
        value = primaryEmail?.value ?? null;
        break;
      default:
        value =
          storedValue?.value_text ??
          storedValue?.value_number ??
          storedValue?.value_date ??
          storedValue?.value_boolean ??
          storedValue?.value_json ??
          null;
    }

    return {
      id: field.id,
      key: field.key,
      label: field.label,
      fieldType: field.field_type,
      category: field.category,
      storageSource: field.storage_source,
      isSystem: field.is_system,
      isRequired: field.is_required_for_profile,
      value,
    };
  });

  return {
    id: student.id,
    firstName: person?.first_name ?? "Sin nombre",
    lastName: person?.last_name ?? "",
    phone: primaryPhone?.value ?? null,
    email: primaryEmail?.value ?? null,
    status: student.status,
    profileStatus: student.profile_status,
    joinedAt: student.joined_at,
    profileFields,
  };
}
