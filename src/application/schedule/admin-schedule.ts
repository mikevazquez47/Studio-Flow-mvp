import "server-only";

import { getAdminContext } from "@/application/auth/admin-context";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

const APP_TIME_ZONE = "America/Mexico_City";
const APP_OFFSET = "-06:00";

export type AdminBooking = Readonly<{
  id: string;
  personId: string;
  personName: string;
  bookingStatus: "booked" | "waitlisted" | "cancelled";
  attendanceStatus: "pending" | "present" | "late" | "no_show";
}>;

export type AdminClassSession = Readonly<{
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  status: "scheduled" | "cancelled" | "completed";
  branchName: string;
  disciplineName: string | null;
  instructorName: string | null;
  bookings: readonly AdminBooking[];
  bookedCount: number;
  waitlistCount: number;
  presentCount: number;
}>;

function localDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function dayRange(date: string) {
  const start = new Date(`${date}T00:00:00${APP_OFFSET}`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function getAdminSchedule(date = localDateString()) {
  const context = await getAdminContext();
  const supabase = await createSupabaseServerClient();
  const { start, end } = dayRange(date);

  const { data: sessions, error: sessionsError } = await supabase
    .from("class_sessions")
    .select(
      "id,title,starts_at,ends_at,capacity,status,branch_id,discipline_id,instructor_member_id",
    )
    .eq("studio_id", context.studio.id)
    .gte("starts_at", start)
    .lt("starts_at", end)
    .order("starts_at", { ascending: true });

  if (sessionsError) {
    throw new Error(`No se pudo cargar la agenda: ${sessionsError.message}`);
  }

  const sessionRows = sessions ?? [];
  const branchIds = [...new Set(sessionRows.map((row) => row.branch_id).filter(Boolean))];
  const disciplineIds = [
    ...new Set(sessionRows.map((row) => row.discipline_id).filter(Boolean)),
  ];
  const instructorIds = [
    ...new Set(sessionRows.map((row) => row.instructor_member_id).filter(Boolean)),
  ];
  const sessionIds = sessionRows.map((row) => row.id);

  const [branchesResult, disciplinesResult, instructorsResult, bookingsResult] =
    await Promise.all([
      branchIds.length
        ? supabase.from("branches").select("id,name").in("id", branchIds)
        : Promise.resolve({ data: [], error: null }),
      disciplineIds.length
        ? supabase.from("disciplines").select("id,name").in("id", disciplineIds)
        : Promise.resolve({ data: [], error: null }),
      instructorIds.length
        ? supabase
            .from("studio_members")
            .select("id,display_name")
            .in("id", instructorIds)
        : Promise.resolve({ data: [], error: null }),
      sessionIds.length
        ? supabase
            .from("class_bookings")
            .select("id,class_session_id,person_id,booking_status,attendance_status")
            .in("class_session_id", sessionIds)
            .order("booked_at", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
    ]);

  const relatedError =
    branchesResult.error ??
    disciplinesResult.error ??
    instructorsResult.error ??
    bookingsResult.error;

  if (relatedError) {
    throw new Error(`No se pudo completar la agenda: ${relatedError.message}`);
  }

  const bookings = bookingsResult.data ?? [];
  const personIds = [...new Set(bookings.map((row) => row.person_id).filter(Boolean))];
  const peopleResult = personIds.length
    ? await supabase.from("people").select("id,name").in("id", personIds)
    : { data: [], error: null };

  if (peopleResult.error) {
    throw new Error(`No se pudieron cargar las alumnas: ${peopleResult.error.message}`);
  }

  const branchById = new Map((branchesResult.data ?? []).map((row) => [row.id, row.name]));
  const disciplineById = new Map(
    (disciplinesResult.data ?? []).map((row) => [row.id, row.name]),
  );
  const instructorById = new Map(
    (instructorsResult.data ?? []).map((row) => [row.id, row.display_name]),
  );
  const personById = new Map((peopleResult.data ?? []).map((row) => [row.id, row.name]));

  const bookingsBySession = new Map<string, AdminBooking[]>();
  for (const row of bookings) {
    const item: AdminBooking = {
      id: row.id,
      personId: row.person_id,
      personName: personById.get(row.person_id) ?? "Alumna",
      bookingStatus: row.booking_status,
      attendanceStatus: row.attendance_status,
    };
    const current = bookingsBySession.get(row.class_session_id) ?? [];
    current.push(item);
    bookingsBySession.set(row.class_session_id, current);
  }

  const mapped: AdminClassSession[] = sessionRows.map((row) => {
    const sessionBookings = bookingsBySession.get(row.id) ?? [];
    return {
      id: row.id,
      title: row.title,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      capacity: row.capacity,
      status: row.status,
      branchName: branchById.get(row.branch_id) ?? "Sucursal",
      disciplineName: row.discipline_id
        ? disciplineById.get(row.discipline_id) ?? null
        : null,
      instructorName: row.instructor_member_id
        ? instructorById.get(row.instructor_member_id) ?? null
        : null,
      bookings: sessionBookings,
      bookedCount: sessionBookings.filter((item) => item.bookingStatus === "booked").length,
      waitlistCount: sessionBookings.filter((item) => item.bookingStatus === "waitlisted")
        .length,
      presentCount: sessionBookings.filter((item) =>
        ["present", "late"].includes(item.attendanceStatus),
      ).length,
    };
  });

  return { date, context, sessions: mapped } as const;
}

export function getTodayDate() {
  return localDateString();
}
