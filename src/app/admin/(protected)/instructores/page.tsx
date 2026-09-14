import {
  createInstructorQuick,
  listInstructors,
} from "@/application/instructors/instructor-actions";

type InstructorsPageProps = {
  searchParams: Promise<{
    q?: string;
    error?: string;
    created?: string;
  }>;
};

export default async function InstructorsPage({
  searchParams,
}: InstructorsPageProps) {
  const params = await searchParams;
  const instructors = await listInstructors(params.q);

  return (
    <section className="admin-page space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="eyebrow">Equipo</span>
          <h1>Instructores</h1>
          <p className="mt-3 max-w-2xl">
            Administra quién imparte clases. Crear un instructor no genera una
            cuenta de acceso automáticamente.
          </p>
        </div>
        <div className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--muted)]">
          {instructors.length} registrados
        </div>
      </div>

      {params.error ? (
        <div className="auth-error" role="alert">
          {params.error}
        </div>
      ) : null}

      {params.created ? (
        <div className="rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--success)_45%,var(--border))] bg-[color-mix(in_srgb,var(--success)_10%,var(--surface))] px-4 py-3 text-sm">
          {params.created} se agregó al equipo de instructores.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <form className="flex gap-3" method="get">
            <input
              className="field-input"
              type="search"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Buscar por nombre, teléfono o correo"
              aria-label="Buscar instructores"
            />
            <button className="primary-button mt-0 min-w-28 px-5" type="submit">
              Buscar
            </button>
          </form>

          <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
            {instructors.length === 0 ? (
              <div className="p-8 text-center">
                <h2 className="text-xl font-bold">
                  Todavía no hay instructores
                </h2>
                <p className="mt-2">
                  Agrega el primer perfil de instructor sin crear credenciales
                  de acceso innecesarias.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {instructors.map((instructor) => (
                  <article
                    key={instructor.id}
                    className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold">
                          {instructor.firstName} {instructor.lastName}
                        </h2>
                        <span className="rounded-full border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)]">
                          {instructor.status === "ACTIVE"
                            ? "Activo"
                            : "Inactivo"}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
                        {instructor.phone ? (
                          <span>{instructor.phone}</span>
                        ) : null}
                        {instructor.email ? (
                          <span>{instructor.email}</span>
                        ) : null}
                      </div>
                    </div>
                    <span className="text-xs text-[var(--muted)]">
                      Acceso no asignado
                    </span>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
          <span className="eyebrow">Nuevo perfil</span>
          <h2 className="text-2xl font-bold">Agregar instructor</h2>
          <p className="mt-2 text-sm">
            El acceso a la plataforma se asignará por separado solo cuando sea
            necesario.
          </p>

          <form action={createInstructorQuick} className="auth-form mt-6">
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
            />

            <label className="field-label" htmlFor="email">
              Correo
            </label>
            <input
              className="field-input"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
            />

            <button className="primary-button" type="submit">
              Agregar instructor
            </button>
          </form>
        </aside>
      </div>
    </section>
  );
}
