import { AdminLoginForm } from "./login-form";

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground">
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-md content-center">
        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-8 shadow-[var(--shadow-md)]">
          <div className="mb-8">
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-[0.12em] text-accent">
              StudioFlow · Administración
            </span>
            <h1 className="mb-3 text-3xl font-semibold tracking-tight">
              Bienvenido de vuelta
            </h1>
            <p className="text-sm text-muted">
              Ingresa con la cuenta administrativa asociada a tu estudio.
            </p>
          </div>

          <AdminLoginForm />
        </section>
      </div>
    </main>
  );
}
