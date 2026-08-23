"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

const MODE_LABEL: Record<Mode, string> = {
  signin: "Accedi",
  signup: "Crea account",
};

/** Login e registrazione con email e password (Supabase Auth). */
export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        // Con la conferma via email attiva la sessione non parte subito:
        // l'utente deve prima cliccare il link ricevuto.
        if (!data.session) {
          setNotice(
            "Ti abbiamo inviato un'email di conferma: aprila per attivare l'account.",
          );
          setIsSubmitting(false);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
      }

      router.replace(next);
      router.refresh();
    } catch (authError) {
      console.error("Autenticazione fallita:", authError);
      setError(
        authError instanceof Error
          ? authError.message
          : "Autenticazione non riuscita. Riprova.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex border border-rule">
        {(["signin", "signup"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value);
              setError(null);
              setNotice(null);
            }}
            aria-pressed={mode === value}
            className={`flex-1 px-3 py-2 font-mono text-[0.6875rem] uppercase tracking-wide transition-colors ${
              mode === value
                ? "bg-ink text-paper"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {MODE_LABEL[value]}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            className="border border-rule-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            className="border border-rule-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Attendi..." : MODE_LABEL[mode]}
        </button>
      </form>

      {notice && (
        <p className="mt-4 text-sm text-ink-soft" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="mt-4 text-sm text-alert" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
