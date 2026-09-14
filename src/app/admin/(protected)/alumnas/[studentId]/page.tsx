import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudent360 } from "@/application/students/student-actions";

type Student360PageProps = {
  params: Promise<{ studentId: string }>;
};

function formatProfileValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Sin información";
  }

  if (typeof value === "boolean") {
    return value ? "Sí" : "No";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

export default async function Student360Page({ params }: Student360PageProps) {
  const { studentId } = await params;
  const student = await getStudent360(studentId);

  if (!student) {
    notFound();
  }

  const fullName = `${student.firstName} ${student.lastName}`.trim();

  return (
    <section className="admin-page space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/alumnas"
          className="text-sm font-bold text-[var(--accent)]"
        >
          ← Volver a alumnas
        </Link>
        <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)]">
          {student.status === "ACTIVE" ? "Activa" : student.status}
        </span>
      </div>

      <header className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
        <span className="eyebrow">Perfil 360</span>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <h1>{fullName}</h1>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--muted)]">
              <span>{student.phone ?? "Sin teléfono"}</span>
              {student.email ? <span>{student.email}</span> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {student.phone ? (
              <a
                href={`https://wa.me/${student.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="min-h-11 rounded-[var(--radius-md)] border border-[var(--border)] px-4 py-3 text-sm font-bold text-[var(--foreground)]"
              >
                WhatsApp
              </a>
            ) : null}
            <button
              type="button"
              disabled
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-sm font-bold text-[var(--muted)]"
              title="Reservar se habilita en la fase de Reservaciones"
            >
              Reservar
            </button>
            <button
              type="button"
              disabled
              className="primary-button mt-0 min-h-11 px-4"
              title="Venta se habilita en Sprint 4"
            >
              + Venta
            </button>
          </div>
        </div>
      </header>

      {student.profileStatus === "INCOMPLETE" ? (
        <div className="rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--warning)_45%,var(--border))] bg-[color-mix(in_srgb,var(--warning)_10%,var(--surface))] px-4 py-3 text-sm">
          El perfil está incompleto. Los campos faltantes se mostrarán aquí y podrán
          completarse sin perder la operación básica de la alumna.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="space-y-6">
          <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="eyebrow">Información</span>
                <h2 className="text-2xl font-bold">Perfil de la alumna</h2>
              </div>
              <span className="text-xs text-[var(--muted)]">
                {student.profileStatus === "COMPLETE" ? "Completo" : "Incompleto"}
              </span>
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              {student.profileFields.map((field) => (
                <div
                  key={field.id}
                  className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)] p-4"
                >
                  <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
                    {field.label}
                    {field.isRequired ? " · requerido" : ""}
                  </dt>
                  <dd className="mt-2 break-words text-sm font-semibold text-[var(--foreground)]">
                    {formatProfileValue(field.value)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6">
            <span className="eyebrow">Actividad</span>
            <h2 className="text-2xl font-bold">Historial</h2>
            <p className="mt-3">
              Reservaciones, asistencias, compras, pagos y movimientos aparecerán en
              esta línea de tiempo conforme entren sus dominios al MVP.
            </p>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6">
            <span className="eyebrow">Paquete</span>
            <h2 className="text-xl font-bold">Sin paquete activo</h2>
            <p className="mt-2 text-sm">
              Esta tarjeta se conectará al ledger de créditos en Sprint 5.
            </p>
          </section>

          <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6">
            <span className="eyebrow">Próxima clase</span>
            <h2 className="text-xl font-bold">Sin reservaciones</h2>
            <p className="mt-2 text-sm">
              Las próximas clases se conectarán al motor de reservaciones en Sprint 6.
            </p>
          </section>
        </aside>
      </div>
    </section>
  );
}
