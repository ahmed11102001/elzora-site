"use client";

import { useActionState } from "react";
import { signIn, type FormState } from "@/admin/auth/actions";
import { buttonClass, TextField } from "@/admin/ui/primitives";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, {});
  return (
    <form action={action} className="grid gap-4" noValidate>
      <TextField
        id="email"
        name="email"
        type="email"
        label="E-mail address"
        autoComplete="username"
        inputMode="email"
        required
      />
      <TextField
        id="password"
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        required
      />
      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass()}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
