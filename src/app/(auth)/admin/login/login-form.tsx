"use client";

import { useActionState } from "react";
import { loginAdmin, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(loginAdmin, initialState);

  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-2">
        <label className="text-sm font-medium text-foreground" htmlFor="email">
          Correo electrónico
        </label>
        <input
          autoComplete="email"
          className="min-h-12 rounded-[var(--radius-md)] border border-border bg-surface-elevated px-4 text-foreground outline-none placeholder:text-muted"
          id="email"
          name="email"
          placeholder="tu@correo.com"
          required
          type="email"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-foreground" htmlFor="password">
          Contraseña
        </label>
        <input
          autoComplete="current-password"
          className="min-h-12 rounded-[var(--radius-md)] border border-border bg-surface-elevated px-4 text-foreground outline-none placeholder:text-muted"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>

      {state.error ? (
        <p
          aria-live="polite"
          className="rounded-[var(--radius-md)] border border-danger/40 bg-danger/10 p-3 text-sm text-danger"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <button
        className="min-h-12 rounded-[var(--radius-md)] bg-accent px-5 font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
