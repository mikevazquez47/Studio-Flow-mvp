import { getAdminSchedule } from "@/application/schedule/admin-schedule";

const timeFormatter = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  hour: "numeric",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  weekday: "long",
  day: "numeric",
  month: "long",
});

function attendanceLabel(value: string) {
  if (value === "present") return "Presente";
  if (value === "late") return "Llegó tarde";
  if (value === "no_show") return "No asistió";
  return "Pendiente";
}

export default async function AgendaPage() {
  const { sessions, date, context } = await getAdminSchedule();
  const day = new Date(`${date}T12:00:00-06:00`);
  const totalBooked = sessions.reduce((sum, session) => sum + session.bookedCount, 0);
  const totalCapacity = sessions.reduce((sum, session) => sum + session.capacity, 0);
  const totalWaitlist = sessions.reduce((sum, session) => sum + session.waitlistCount, 0);

  return (
    <section className="admin-page schedule-page">
      <header className="schedule-header">
        <div>
          <span className="eyebrow">Agenda · {context.studio.name}</span>
          <h1>Clases del día</h1>
          <p className="schedule-date">{dateFormatter.format(day)}</p>
        </div>
        <span className="schedule-readonly-badge">Vista operativa</span>
      </header>

      <div className="schedule-metrics" aria-label="Resumen de agenda">
        <article className="schedule-metric">
          <span>Clases</span>
          <strong>{sessions.length}</strong>
        </article>
        <article className="schedule-metric">
          <span>Reservas</span>
          <strong>{totalBooked}</strong>
        </article>
        <article className="schedule-metric">
          <span>Cupos totales</span>
          <strong>{totalCapacity}</strong>
        </article>
        <article className="schedule-metric">
          <span>Lista de espera</span>
          <strong>{totalWaitlist}</strong>
        </article>
      </div>

      {sessions.length === 0 ? (
        <div className="schedule-empty">
          <strong>No hay clases programadas para hoy.</strong>
          <p>Cuando agreguemos horarios, aparecerán aquí por orden de inicio.</p>
        </div>
      ) : (
        <div className="schedule-list">
          {sessions.map((session) => {
            const occupancy = Math.min(
              100,
              Math.round((session.bookedCount / session.capacity) * 100),
            );
            const activeBookings = session.bookings.filter(
              (booking) => booking.bookingStatus !== "cancelled",
            );

            return (
              <article className="schedule-session" key={session.id}>
                <div className="schedule-time">
                  <strong>{timeFormatter.format(new Date(session.startsAt))}</strong>
                  <span>{timeFormatter.format(new Date(session.endsAt))}</span>
                </div>

                <div className="schedule-session-main">
                  <div className="schedule-session-heading">
                    <div>
                      <div className="schedule-title-row">
                        <h2>{session.title}</h2>
                        <span className={`status-pill status-${session.status}`}>
                          {session.status === "scheduled"
                            ? "Programada"
                            : session.status === "completed"
                              ? "Terminada"
                              : "Cancelada"}
                        </span>
                      </div>
                      <p>
                        {session.disciplineName ?? "Clase"} · {session.branchName}
                        {session.instructorName
                          ? ` · ${session.instructorName}`
                          : " · Sin instructor asignado"}
                      </p>
                    </div>
                    <div className="schedule-capacity">
                      <strong>
                        {session.bookedCount}/{session.capacity}
                      </strong>
                      <span>reservadas</span>
                    </div>
                  </div>

                  <div className="occupancy-track" aria-label={`${occupancy}% de ocupación`}>
                    <span style={{ width: `${occupancy}%` }} />
                  </div>

                  <div className="schedule-session-stats">
                    <span>{session.presentCount} presentes</span>
                    <span>{session.waitlistCount} en espera</span>
                    <span>{Math.max(session.capacity - session.bookedCount, 0)} lugares libres</span>
                  </div>

                  <details className="booking-details">
                    <summary>Ver alumnas ({activeBookings.length})</summary>
                    {activeBookings.length === 0 ? (
                      <p className="booking-empty">Todavía no hay reservas.</p>
                    ) : (
                      <div className="booking-list">
                        {activeBookings.map((booking) => (
                          <div className="booking-row" key={booking.id}>
                            <div>
                              <strong>{booking.personName}</strong>
                              <span>
                                {booking.bookingStatus === "waitlisted"
                                  ? "Lista de espera"
                                  : "Reservada"}
                              </span>
                            </div>
                            <span className={`attendance attendance-${booking.attendanceStatus}`}>
                              {attendanceLabel(booking.attendanceStatus)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </details>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
