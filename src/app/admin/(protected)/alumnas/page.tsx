import Link from "next/link";
import {
  createStudentQuick,
  listStudents,
} from "@/application/students/student-actions";

type StudentsPageProps = {
  searchParams: Promise<{
    q?: string;
    scope?: string;
    error?: string;
    created?: string;
    archived?: string;
  }>;
};

export default async function StudentsPage({
  searchParams,
}: StudentsPageProps) {
  const params = await searchParams;
  const scope = params.scope === "archived" ? "archived" : "current";
  const students = await listStudents(params.q, scope);

  return (
    <section className="admin-page space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="eyebrow">Personas</span>
          <h1>Alumnas</h1>
          <p className="mt-3 max-w-2xl">
            Busca, registra y consulta la base operativa de alumnas del estudio.
          </p>
        </div>
        <div className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--muted)]">
          {students.length} visibles
        </div>
      </div>

      {params.error ? (
        <div className="auth-error" role="alert">
          {params.error}
        </div>
      ) : null}

      {params.created ? (
        <div className="rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--success)_45%,var(--border))] bg-[color-mix(in_srgb,var(--success)_10%,var(--surface))] px-4 py-3 text-sm text-[var(--foreground)]">
          {params.created} se agregó correctamente.
        </div>
      ) : null}

      {params.archived ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
          La alumna fue archivada. Su historial se conserva intacto.
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/alumnas"
          className={`rounded-full border px-4 py-2 text-sm font-bold ${
            scope === "current"
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-[var(--border)] text-[var(--muted)]"
          }`}
        >
          Actuales
        </Link>
        <Link
          href="/admin/alumnas?scope=archived"
          className={`rounded-full border px-4 py-2 text-sm font-bold ${
            scope === "archived"
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-[var(--border)] text-[var(--muted)]"
          }`}
        >
          Archivadas
        </Link>
      </div>

      <div
        className={
          scope === "current"
            ? "grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]"
            : "grid gap-6"
        }
      >
        <div className="space-y-4">
          <form className="flex gap-3" method="get">
            {scope === "archived" ? (
              <input type="hidden" name="scope" value="archived" />
            ) : null}
            <input
              className="field-input"
              type="search"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Buscar por nombre o teléfono"
              aria-label="Buscar alumnas por nombre o teléfono"
            />
            <button className="primary-button mt-0 min-w-28 px-5" type="submit">
              Buscar
            </button>
          </form>

          <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
            {students.length === 0 ? (
              <div className="p-8 text-center">
                <h2 className="text-xl font-bold">
                  {scope === "archived"
                    ? "No hay alumnas archivadas"
                    : "Todavía no hay alumnas aquí"}
                </h2>
                <p className="mt-2">
                  {scope === "archived"
                    ? "Las alumnas archivadas aparecerán aquí sin perder su historial."
                    : "Registra la primera con el formulario rápido. Nombre y teléfono son suficientes."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {students.map((student) => (
                  <article
                    key={student.id}
                    className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-bold">
                          {student.firstName} {student.lastName}
                        </h2>
                        <span className="rounded-full border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)]">
                          {student.status === "ACTIVE"
                            ? "Activa"
                            : student.status === "ARCHIVED"
                              ? "Archivada"
                              : "Inactiva"}
                        </span>
                        {student.profileStatus === "INCOMPLETE" ? (
                          <span className="rounded-full border border-[color-mix(in_srgb,var(--warning)_45%,var(--border))] px-2 py-1 text-xs text-[var(--warning)]">
                            Perfil incompleto
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm">{student.phone}</p>
                    </div>
                    <Link
                      href={`/admin/alumnas/${student.id}`}
                      className="grid min-h-11 place-items-center rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-sm font-bold text-[var(--foreground)]"
                      aria-label={`Abrir perfil de ${student.firstName}`}
                    >
                      Ver perfil
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        {scope === "current" ? (
          <aside className="h-fit rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
            <span className="eyebrow">Alta rápida</span>
            <h2 className="text-2xl font-bold">Nueva alumna</h2>
            <p className="mt-2 text-sm">
              Puedes completar el resto del perfil después. No bloqueamos la
              operación del estudio.
            </p>

            <form action={createStudentQuick} className="auth-form mt-6">
              <label className="field-label" htmlFor="firstName">
                Nombre
              </label>
              <input
                className="field-input"
                id="firstName"
                name="firstName"
                autoComplete="given-name"
                required
              />

              <label className="field-label" htmlFor="lastName">
                Apellidos
              </label>
              <input
                className="field-input"
                id="lastName"
                name="lastName"
                autoComplete="family-name"
              />

              <label className="field-label" htmlFor="phone">
                Teléfono
              </label>
              <input
                className="field-input"
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+5213312345678"
                required
              />
              <p className="text-xs text-[var(--muted)]">
                Incluye lada internacional. Esto mantiene el teléfono listo para
                acceso y WhatsApp futuros.
              </p>

              <button className="primary-button" type="submit">
                Agregar alumna
              </button>
            </form>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
