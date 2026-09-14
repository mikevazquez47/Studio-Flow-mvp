import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  async function login(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      redirect("/admin/login?error=Completa%20correo%20y%20contrase%C3%B1a");
    }

    const supabase = await createSupabaseServerClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      redirect("/admin/login?error=Credenciales%20inv%C3%A1lidas");
    }

    redirect("/admin");
  }

  return (
    <main className="app-shell">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-brand">
          <span className="brand-mark">SF</span>
          <div>
            <span className="eyebrow">StudioFlow · Administración</span>
            <h1 id="login-title" className="auth-title">
              Inicia sesión
            </h1>
          </div>
        </div>

        <p className="auth-copy">
          Acceso privado para propietarios, administración, recepción e
          instructores.
        </p>

        {error ? (
          <div className="auth-error" role="alert">
            {error}
          </div>
        ) : null}

        <form action={login} className="auth-form">
          <label className="field-label" htmlFor="email">
            Correo
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="field-input"
            placeholder="tu@estudio.com"
          />

          <label className="field-label" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="field-input"
            placeholder="••••••••"
          />

          <button type="submit" className="primary-button">
            Entrar a StudioFlow
          </button>
        </form>
      </section>
    </main>
  );
}
