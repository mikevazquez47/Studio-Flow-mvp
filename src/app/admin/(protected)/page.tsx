import Link from "next/link";
import { getAdminSchedule } from "@/application/schedule/admin-schedule";

const timeFormatter = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  hour: "numeric",
  minute: "2-digit",
});

export default async function AdminHomePage() {
  const { sessions, context } = await getAdminSchedule();
  const scheduled = sessions.filter(
    (session) => session.status === "scheduled",
  );
  const nextSession = scheduled[0] ?? null;
  const reservations = sessions.reduce(
    (sum, session) => sum + session.bookedCount,
    0,
  );
  const present = sessions.reduce(
    (sum, session) => sum + session.presentCount,
    0,
  );
  const waiting = sessions.reduce(
    (sum, session) => sum + session.waitlistCount,
    0,
  );

  return (
    <section className="admin-page today-page">
      <header className="schedule-header">
        <div>
          <span className="eyebrow">Hoy · {context.studio.name}</span>
          <h1>Tu operación de hoy</h1>
          <p>Clases, reservas y asistencia en un solo lugar.</p>
        </div>
        <Link className="secondary-action" href="/admin/agenda">
          Abrir agenda
        </Link>
      </header>

      <div className="schedule-metrics">
        <article className="schedule-metric">
          <span>Clases</span>
          <strong>{sessions.length}</strong>
        </article>
        <article className="schedule-metric">
          <span>Reservas</span>
          <strong>{reservations}</strong>
        </article>
        <article className="schedule-metric">
          <span>Asistencias</span>
          <strong>{present}</strong>
        </article>
        <article className="schedule-metric">
          <span>En espera</span>
          <strong>{waiting}</strong>
        </article>
      </div>

      <div className="today-grid">
        <article className="today-primary-card">
          <span className="card-kicker">Próxima clase</span>
          {nextSession ? (
            <>
              <div className="next-class-time">
                {timeFormatter.format(new Date(nextSession.startsAt))}
              </div>
              <h2>{nextSession.title}</h2>
              <p>
                {nextSession.branchName}
                {nextSession.instructorName
                  ? ` · ${nextSession.instructorName}`
                  : " · Sin instructor asignado"}
              </p>
              <div className="next-class-numbers">
                <span>
                  <strong>{nextSession.bookedCount}</strong> reservadas
                </span>
                <span>
                  <strong>{nextSession.presentCount}</strong> presentes
                </span>
                <span>
                  <strong>
                    {Math.max(
                      nextSession.capacity - nextSession.bookedCount,
                      0,
                    )}
                  </strong>{" "}
                  lugares libres
                </span>
              </div>
              <Link className="primary-link" href="/admin/agenda">
                Ver clase y alumnas
              </Link>
            </>
          ) : (
            <div className="schedule-empty compact-empty">
              <strong>No hay una próxima clase programada.</strong>
              <p>La agenda de hoy está libre por ahora.</p>
            </div>
          )}
        </article>

        <aside className="today-side-card">
          <span className="card-kicker">Resto del día</span>
          {scheduled.slice(1, 4).length ? (
            <div className="today-upcoming-list">
              {scheduled.slice(1, 4).map((session) => (
                <div className="today-upcoming-row" key={session.id}>
                  <span>
                    {timeFormatter.format(new Date(session.startsAt))}
                  </span>
                  <div>
                    <strong>{session.title}</strong>
                    <small>
                      {session.bookedCount}/{session.capacity} lugares
                    </small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No hay más clases programadas para hoy.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
